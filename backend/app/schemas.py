from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None
    user_id: Optional[int] = None

# User Schemas
class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str
    role: str  # "admin" or "receptionist"

class UserUpdate(BaseModel):
    password: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class UserResponse(UserBase):
    id: int
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        orm_mode = True
        from_attributes = True

# Room Block Schemas
class RoomBlockBase(BaseModel):
    reason: str
    start_date: datetime
    end_date: Optional[datetime] = None

class RoomBlockCreate(RoomBlockBase):
    pass

class RoomBlockResponse(RoomBlockBase):
    id: int
    room_id: int
    is_active: bool
    created_by: int
    created_at: datetime

    class Config:
        orm_mode = True
        from_attributes = True

# Booking Schemas
class BookingBase(BaseModel):
    patient_name: str
    patient_contact: str
    check_in: datetime
    check_out: datetime

class BookingCreate(BookingBase):
    room_id: int

class BookingUpdate(BaseModel):
    patient_name: Optional[str] = None
    patient_contact: Optional[str] = None
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    status: Optional[str] = None  # "Active" or "Cancelled"
    room_id: Optional[int] = None

class BookingResponse(BookingBase):
    id: int
    room_id: int
    status: str
    booked_by: int
    created_at: datetime

    class Config:
        orm_mode = True
        from_attributes = True

# Room Schemas
class RoomBase(BaseModel):
    room_number: str
    room_type: str  # "General", "ICU", "Private", "Semi-private"
    floor: int
    capacity: int

class RoomCreate(RoomBase):
    pass

class RoomUpdate(BaseModel):
    room_number: Optional[str] = None
    room_type: Optional[str] = None
    floor: Optional[int] = None
    capacity: Optional[int] = None
    is_active: Optional[bool] = None

class RoomResponse(RoomBase):
    id: int
    is_active: bool
    created_at: datetime
    status: Optional[str] = None
    blocks: List[RoomBlockResponse] = []
    bookings: List[BookingResponse] = []

    class Config:
        orm_mode = True
        from_attributes = True
