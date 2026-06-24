import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from ..database import get_db
from .. import crud, schemas, auth, models

router = APIRouter(prefix="/api/rooms", tags=["rooms"])

def determine_room_status(
    db: Session, 
    room_id: int, 
    start_time: datetime.datetime, 
    end_time: datetime.datetime
) -> str:
    # Check if there is an active maintenance block overlapping this window
    overlapping_block = db.query(models.RoomBlock).filter(
        models.RoomBlock.room_id == room_id,
        models.RoomBlock.is_active == True,
        models.RoomBlock.start_date < end_time,
        (models.RoomBlock.end_date == None) | (models.RoomBlock.end_date > start_time)
    ).first()
    
    if overlapping_block:
        return "Maintenance"

    # Check if there is an active booking overlapping this window
    overlapping_booking = db.query(models.Booking).filter(
        models.Booking.room_id == room_id,
        models.Booking.status == "Active",
        models.Booking.check_in < end_time,
        models.Booking.check_out > start_time
    ).first()
    
    if overlapping_booking:
        return "Occupied"

    return "Available"

@router.get("", response_model=List[schemas.RoomResponse])
def read_rooms(
    check_in: Optional[datetime.datetime] = Query(None),
    check_out: Optional[datetime.datetime] = Query(None),
    room_type: Optional[str] = Query(None),
    available_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    # Determine the time window for status assessment
    # If check_in is provided but not check_out, set check_out to 24 hours later
    # If neither is provided, default to current time to current time + 1 hour (for instantaneous status check)
    now = datetime.datetime.utcnow()
    t_start = check_in if check_in else now
    t_end = check_out if check_out else (check_in + datetime.timedelta(days=1) if check_in else now + datetime.timedelta(hours=1))

    # Validate date range
    if t_start >= t_end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Check-out time must be after check-in time"
        )

    # Get all active rooms for receptionists, all rooms for admins
    active_only = current_user.role != "admin"
    rooms = crud.get_rooms(db, active_only=active_only)

    response_rooms = []
    for room in rooms:
        # Filter by room_type if provided
        if room_type and room.room_type != room_type:
            continue

        room_status = determine_room_status(db, room.id, t_start, t_end)
        
        # Filter by availability if requested
        if available_only and room_status != "Available":
            continue

        # Map to schemas.RoomResponse structure
        # Prefetch blocks and bookings to avoid lazy loading issues
        blocks_data = [
            schemas.RoomBlockResponse.from_orm(b) 
            for b in room.blocks 
            if b.is_active
        ]
        bookings_data = [
            schemas.BookingResponse.from_orm(bk) 
            for bk in room.bookings 
            if bk.status == "Active"
        ]
        
        room_res = schemas.RoomResponse(
            id=room.id,
            room_number=room.room_number,
            room_type=room.room_type,
            floor=room.floor,
            capacity=room.capacity,
            is_active=room.is_active,
            created_at=room.created_at,
            status=room_status,
            blocks=blocks_data,
            bookings=bookings_data
        )
        response_rooms.append(room_res)

    return response_rooms

@router.post("", response_model=schemas.RoomResponse, status_code=status.HTTP_201_CREATED)
def create_new_room(
    room_in: schemas.RoomCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_admin)
):
    db_room = crud.get_room_by_number(db, room_number=room_in.room_number)
    if db_room:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Room number already exists"
        )
    room = crud.create_room(db, room_in=room_in)
    room.status = "Available"
    return room

@router.put("/{room_id}", response_model=schemas.RoomResponse)
def update_room_details(
    room_id: int,
    room_in: schemas.RoomUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_admin)
):
    room = crud.update_room(db, room_id=room_id, room_in=room_in)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    # Check status for now
    now = datetime.datetime.utcnow()
    room.status = determine_room_status(db, room.id, now, now + datetime.timedelta(hours=1))
    return room

@router.delete("/{room_id}", response_model=schemas.RoomResponse)
def delete_room(
    room_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_admin)
):
    # Soft delete room
    room_in = schemas.RoomUpdate(is_active=False)
    room = crud.update_room(db, room_id=room_id, room_in=room_in)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    room.status = "Inactive"
    return room

@router.post("/{room_id}/block", response_model=schemas.RoomBlockResponse, status_code=status.HTTP_201_CREATED)
def block_room_for_maintenance(
    room_id: int,
    block_in: schemas.RoomBlockCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_admin)
):
    # Verify room exists
    room = crud.get_room(db, room_id=room_id)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
        
    # Check if there are active bookings during this block window
    # Provide a warning or prevent blocking based on design
    # Let's check for overlapping active bookings
    t_start = block_in.start_date
    t_end = block_in.end_date if block_in.end_date else t_start + datetime.timedelta(days=365) # treat indef blocks as 1yr for checking
    
    overlapping_booking = db.query(models.Booking).filter(
        models.Booking.room_id == room_id,
        models.Booking.status == "Active",
        models.Booking.check_in < t_end,
        models.Booking.check_out > t_start
    ).first()
    
    if overlapping_booking:
        # We allow blocking but raise an alert, or prevent it?
        # Let's raise an HTTP 400 Bad Request to protect active stays
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot block room. There is an active booking for patient {overlapping_booking.patient_name} during this period."
        )

    block = crud.block_room(db, room_id=room_id, block_in=block_in, user_id=current_user.id)
    if not block:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to block room"
        )
    return block

@router.delete("/{room_id}/block/{block_id}", response_model=schemas.RoomBlockResponse)
def remove_room_block(
    room_id: int,
    block_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_admin)
):
    block = crud.unblock_room(db, block_id=block_id)
    if not block or block.room_id != room_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active block record not found for this room"
        )
    return block
