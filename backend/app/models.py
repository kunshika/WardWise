import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False)  # "admin" or "receptionist"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    bookings = relationship("Booking", back_populates="creator")
    created_blocks = relationship("RoomBlock", back_populates="creator")


class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    room_number = Column(String, unique=True, index=True, nullable=False)
    room_type = Column(String, nullable=False)  # "General", "ICU", "Private", "Semi-private"
    floor = Column(Integer, nullable=False)
    capacity = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    bookings = relationship("Booking", back_populates="room")
    blocks = relationship("RoomBlock", back_populates="room")


class RoomBlock(Base):
    __tablename__ = "room_blocks"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    reason = Column(String, nullable=False)  # "Maintenance", "Cleaning", "Reserved"
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=True)  # Nullable means blocked indefinitely
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    room = relationship("Room", back_populates="blocks")
    creator = relationship("User", back_populates="created_blocks")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    patient_name = Column(String, nullable=False)
    patient_contact = Column(String, nullable=False)
    check_in = Column(DateTime, nullable=False)
    check_out = Column(DateTime, nullable=False)
    status = Column(String, default="Active")  # "Active", "Cancelled"
    booked_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    room = relationship("Room", back_populates="bookings")
    creator = relationship("User", back_populates="bookings")
