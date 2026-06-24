import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from ..database import get_db
from .. import crud, schemas, auth, models

router = APIRouter(prefix="/api/bookings", tags=["bookings"])

@router.get("", response_model=List[schemas.BookingResponse])
def read_bookings(
    room_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    start_date: Optional[datetime.datetime] = Query(None),
    end_date: Optional[datetime.datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    query = db.query(models.Booking)

    # If user is a receptionist, we allow them to see all bookings but filter if needed
    # (Admins have full visibility, receptionists can also see list for scheduling availability)
    
    if room_id is not None:
        query = query.filter(models.Booking.room_id == room_id)
        
    if status_filter is not None:
        query = query.filter(models.Booking.status == status_filter)
        
    if search is not None and search.strip() != "":
        search_term = f"%{search}%"
        query = query.filter(
            (models.Booking.patient_name.ilike(search_term)) | 
            (models.Booking.patient_contact.ilike(search_term))
        )
        
    if start_date is not None:
        query = query.filter(models.Booking.check_in >= start_date)
        
    if end_date is not None:
        query = query.filter(models.Booking.check_out <= end_date)

    # Sort bookings by created_at or check_in
    bookings = query.order_by(models.Booking.check_in.asc()).all()
    return bookings

@router.get("/{booking_id}", response_model=schemas.BookingResponse)
def read_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    booking = crud.get_booking(db, booking_id=booking_id)
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    return booking

@router.post("", response_model=schemas.BookingResponse, status_code=status.HTTP_201_CREATED)
def create_new_booking(
    booking_in: schemas.BookingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    # Verify date coherence
    if booking_in.check_in >= booking_in.check_out:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Check-out time must be after check-in time"
        )
        
    if booking_in.check_in < datetime.datetime.utcnow() - datetime.timedelta(minutes=15):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot make bookings in the past"
        )

    # Verify room exists and is active
    room = crud.get_room(db, booking_in.room_id)
    if not room or not room.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active room not found"
        )

    # Perform booking
    booking = crud.create_booking(db, booking_in=booking_in, user_id=current_user.id)
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Room is not available (either blocked for maintenance or already occupied) for the selected dates."
        )
    return booking

@router.put("/{booking_id}", response_model=schemas.BookingResponse)
def update_booking_details(
    booking_id: int,
    booking_in: schemas.BookingUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    # Validate details if changing
    if booking_in.check_in is not None and booking_in.check_out is not None:
        if booking_in.check_in >= booking_in.check_out:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Check-out time must be after check-in time"
            )

    booking = crud.get_booking(db, booking_id=booking_id)
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )

    # Receptionists can modify any booking, but let's restrict if we want
    # For MVP, both receptionists and admins can modify bookings
    updated_booking = crud.update_booking(db, booking_id=booking_id, booking_in=booking_in)
    if not updated_booking:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update booking. Target room is occupied or blocked during the requested dates."
        )
    return updated_booking

@router.delete("/{booking_id}", response_model=schemas.BookingResponse)
def cancel_existing_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    booking = crud.get_booking(db, booking_id=booking_id)
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    cancelled_booking = crud.cancel_booking(db, booking_id=booking_id)
    return cancelled_booking
