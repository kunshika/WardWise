import datetime
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from . import models, schemas, auth

# --- User CRUD ---
def get_user_by_username(db: Session, username: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.username == username).first()

def get_users(db: Session) -> List[models.User]:
    return db.query(models.User).all()

def create_user(db: Session, user_in: schemas.UserCreate) -> models.User:
    hashed_pwd = auth.get_password_hash(user_in.password)
    db_user = models.User(
        username=user_in.username,
        hashed_password=hashed_pwd,
        role=user_in.role,
        is_active=True
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(db: Session, user_id: int, user_in: schemas.UserUpdate) -> Optional[models.User]:
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        return None
    if user_in.password is not None:
        db_user.hashed_password = auth.get_password_hash(user_in.password)
    if user_in.role is not None:
        db_user.role = user_in.role
    if user_in.is_active is not None:
        db_user.is_active = user_in.is_active
    db.commit()
    db.refresh(db_user)
    return db_user

# --- Room CRUD ---
def get_room(db: Session, room_id: int) -> Optional[models.Room]:
    return db.query(models.Room).filter(models.Room.id == room_id).first()

def get_room_by_number(db: Session, room_number: str) -> Optional[models.Room]:
    return db.query(models.Room).filter(models.Room.room_number == room_number).first()

def get_rooms(db: Session, active_only: bool = False) -> List[models.Room]:
    query = db.query(models.Room)
    if active_only:
        query = query.filter(models.Room.is_active == True)
    return query.all()

def create_room(db: Session, room_in: schemas.RoomCreate) -> models.Room:
    db_room = models.Room(
        room_number=room_in.room_number,
        room_type=room_in.room_type,
        floor=room_in.floor,
        capacity=room_in.capacity,
        is_active=True
    )
    db.add(db_room)
    db.commit()
    db.refresh(db_room)
    return db_room

def update_room(db: Session, room_id: int, room_in: schemas.RoomUpdate) -> Optional[models.Room]:
    db_room = db.query(models.Room).filter(models.Room.id == room_id).first()
    if not db_room:
        return None
    for field, value in room_in.dict(exclude_unset=True).items():
        setattr(db_room, field, value)
    db.commit()
    db.refresh(db_room)
    return db_room

# --- Check Room Availability ---
def check_room_availability(
    db: Session, 
    room_id: int, 
    start_time: datetime.datetime, 
    end_time: datetime.datetime, 
    exclude_booking_id: Optional[int] = None
) -> bool:
    # 1. Check if room exists and is active
    room = db.query(models.Room).filter(models.Room.id == room_id, models.Room.is_active == True).first()
    if not room:
        return False

    # 2. Check for active maintenance blocks overlap
    # Overlap occurs when: block.start_date < end_time AND (block.end_date is Null OR block.end_date > start_time)
    overlapping_block = db.query(models.RoomBlock).filter(
        models.RoomBlock.room_id == room_id,
        models.RoomBlock.is_active == True,
        models.RoomBlock.start_date < end_time,
        or_(
            models.RoomBlock.end_date == None,
            models.RoomBlock.end_date > start_time
        )
    ).first()
    
    if overlapping_block:
        return False

    # 3. Check for active booking overlap
    # Overlap occurs when: booking.check_in < end_time AND booking.check_out > start_time
    booking_query = db.query(models.Booking).filter(
        models.Booking.room_id == room_id,
        models.Booking.status == "Active",
        models.Booking.check_in < end_time,
        models.Booking.check_out > start_time
    )
    if exclude_booking_id:
        booking_query = booking_query.filter(models.Booking.id != exclude_booking_id)
        
    overlapping_booking = booking_query.first()
    if overlapping_booking:
        return False

    return True

# --- Room Blocking ---
def block_room(db: Session, room_id: int, block_in: schemas.RoomBlockCreate, user_id: int) -> Optional[models.RoomBlock]:
    db_room = get_room(db, room_id)
    if not db_room or not db_room.is_active:
        return None
        
    db_block = models.RoomBlock(
        room_id=room_id,
        reason=block_in.reason,
        start_date=block_in.start_date,
        end_date=block_in.end_date,
        is_active=True,
        created_by=user_id
    )
    db.add(db_block)
    db.commit()
    db.refresh(db_block)
    return db_block

def unblock_room(db: Session, block_id: int) -> Optional[models.RoomBlock]:
    db_block = db.query(models.RoomBlock).filter(models.RoomBlock.id == block_id).first()
    if not db_block:
        return None
    db_block.is_active = False
    db_block.end_date = datetime.datetime.utcnow()
    db.commit()
    db.refresh(db_block)
    return db_block

def get_room_blocks(db: Session, room_id: Optional[int] = None) -> List[models.RoomBlock]:
    query = db.query(models.RoomBlock)
    if room_id is not None:
        query = query.filter(models.RoomBlock.room_id == room_id)
    return query.all()

# --- Bookings CRUD ---
def get_bookings(db: Session) -> List[models.Booking]:
    return db.query(models.Booking).all()

def get_booking(db: Session, booking_id: int) -> Optional[models.Booking]:
    return db.query(models.Booking).filter(models.Booking.id == booking_id).first()

def create_booking(db: Session, booking_in: schemas.BookingCreate, user_id: int) -> Optional[models.Booking]:
    # Concurrency / Conflict Prevention Check
    # Ensure standard transaction execution: SQLite will serialize writes if we are in a transaction block
    is_available = check_room_availability(
        db, 
        booking_in.room_id, 
        booking_in.check_in, 
        booking_in.check_out
    )
    if not is_available:
        return None
        
    db_booking = models.Booking(
        room_id=booking_in.room_id,
        patient_name=booking_in.patient_name,
        patient_contact=booking_in.patient_contact,
        check_in=booking_in.check_in,
        check_out=booking_in.check_out,
        status="Active",
        booked_by=user_id
    )
    db.add(db_booking)
    db.commit()
    db.refresh(db_booking)
    return db_booking

def update_booking(db: Session, booking_id: int, booking_in: schemas.BookingUpdate) -> Optional[models.Booking]:
    db_booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not db_booking:
        return None

    # Check if dates or room are changing
    target_room_id = booking_in.room_id if booking_in.room_id is not None else db_booking.room_id
    target_check_in = booking_in.check_in if booking_in.check_in is not None else db_booking.check_in
    target_check_out = booking_in.check_out if booking_in.check_out is not None else db_booking.check_out
    
    # If room or dates change, and status remains Active, check availability
    status_will_be = booking_in.status if booking_in.status is not None else db_booking.status
    if status_will_be == "Active" and (
        target_room_id != db_booking.room_id or 
        target_check_in != db_booking.check_in or 
        target_check_out != db_booking.check_out
    ):
        is_available = check_room_availability(
            db, 
            target_room_id, 
            target_check_in, 
            target_check_out, 
            exclude_booking_id=booking_id
        )
        if not is_available:
            return None

    # Apply changes
    for field, value in booking_in.dict(exclude_unset=True).items():
        setattr(db_booking, field, value)
        
    db.commit()
    db.refresh(db_booking)
    return db_booking

def cancel_booking(db: Session, booking_id: int) -> Optional[models.Booking]:
    db_booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not db_booking:
        return None
    db_booking.status = "Cancelled"
    db.commit()
    db.refresh(db_booking)
    return db_booking
