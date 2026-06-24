import datetime
from sqlalchemy.orm import Session
from .database import SessionLocal, engine, Base
from . import models, auth

def seed_db():
    # Make sure tables exist
    Base.metadata.create_all(bind=engine)
    
    db: Session = SessionLocal()
    
    # 1. Create Users
    admin_user = db.query(models.User).filter(models.User.username == "admin").first()
    if not admin_user:
        hashed_admin_pwd = auth.get_password_hash("admin123")
        admin_user = models.User(
            username="admin",
            hashed_password=hashed_admin_pwd,
            role="admin",
            is_active=True
        )
        db.add(admin_user)
        print("Seeded admin user (username: admin, password: admin123)")

    recep_user = db.query(models.User).filter(models.User.username == "receptionist").first()
    if not recep_user:
        hashed_recep_pwd = auth.get_password_hash("receptionist123")
        recep_user = models.User(
            username="receptionist",
            hashed_password=hashed_recep_pwd,
            role="receptionist",
            is_active=True
        )
        db.add(recep_user)
        print("Seeded receptionist user (username: receptionist, password: receptionist123)")

    db.commit()
    db.refresh(admin_user)
    db.refresh(recep_user)

    # 2. Create Rooms
    default_rooms = [
        {"room_number": "101", "room_type": "ICU", "floor": 1, "capacity": 2},
        {"room_number": "102", "room_type": "ICU", "floor": 1, "capacity": 2},
        {"room_number": "105", "room_type": "ICU", "floor": 1, "capacity": 1},
        {"room_number": "201", "room_type": "Private", "floor": 2, "capacity": 1},
        {"room_number": "202", "room_type": "Private", "floor": 2, "capacity": 1},
        {"room_number": "301", "room_type": "Semi-private", "floor": 3, "capacity": 2},
        {"room_number": "302", "room_type": "Semi-private", "floor": 3, "capacity": 2},
        {"room_number": "401", "room_type": "General", "floor": 4, "capacity": 6},
        {"room_number": "402", "room_type": "General", "floor": 4, "capacity": 6},
    ]

    rooms_mapped = {}
    for r_data in default_rooms:
        room = db.query(models.Room).filter(models.Room.room_number == r_data["room_number"]).first()
        if not room:
            room = models.Room(
                room_number=r_data["room_number"],
                room_type=r_data["room_type"],
                floor=r_data["floor"],
                capacity=r_data["capacity"],
                is_active=True
            )
            db.add(room)
            db.flush()  # get room.id
            print(f"Seeded Room {room.room_number} ({room.room_type})")
        rooms_mapped[r_data["room_number"]] = room

    db.commit()

    # 3. Create a room block on 105 for maintenance (starts today, ends in 7 days)
    room_105 = rooms_mapped.get("105")
    if room_105:
        existing_block = db.query(models.RoomBlock).filter(
            models.RoomBlock.room_id == room_105.id,
            models.RoomBlock.is_active == True
        ).first()
        if not existing_block:
            now = datetime.datetime.utcnow()
            block = models.RoomBlock(
                room_id=room_105.id,
                reason="AC unit replacement",
                start_date=now - datetime.timedelta(days=1),
                end_date=now + datetime.timedelta(days=6),
                is_active=True,
                created_by=admin_user.id
            )
            db.add(block)
            print("Seeded maintenance block on Room 105")
            
    # 4. Create an active booking on Room 201 for a patient
    room_201 = rooms_mapped.get("201")
    if room_201:
        existing_booking = db.query(models.Booking).filter(
            models.Booking.room_id == room_201.id,
            models.Booking.status == "Active"
        ).first()
        if not existing_booking:
            now = datetime.datetime.utcnow()
            booking = models.Booking(
                room_id=room_201.id,
                patient_name="Rohan Mehra",
                patient_contact="+919876543210",
                check_in=now,
                check_out=now + datetime.timedelta(days=3),
                status="Active",
                booked_by=recep_user.id
            )
            db.add(booking)
            print("Seeded active booking for Rohan Mehra in Room 201")

    db.commit()
    db.close()
    print("Database seeding completed successfully.")

if __name__ == "__main__":
    seed_db()
