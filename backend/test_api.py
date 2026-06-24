import pytest
import datetime
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.main import app
from backend.app.database import Base, get_db
from backend.app.auth import get_password_hash

# Create an in-memory SQLite database engine for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Override get_db dependency
def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    # Seed users and rooms for testing
    db = TestingSessionLocal()
    
    admin = models_mock_seed_user(db, "test_admin", "admin")
    recep = models_mock_seed_user(db, "test_recep", "receptionist")
    
    # Add a couple of rooms
    r1 = models_mock_seed_room(db, "101", "ICU", 1, 2)
    r2 = models_mock_seed_room(db, "201", "Private", 2, 1)
    
    db.commit()
    db.close()
    
    yield
    
    # Drop tables
    Base.metadata.drop_all(bind=engine)

from backend.app import models
def models_mock_seed_user(db, username, role):
    user = models.User(
        username=username,
        hashed_password=get_password_hash("password123"),
        role=role,
        is_active=True
    )
    db.add(user)
    return user

def models_mock_seed_room(db, room_number, room_type, floor, capacity):
    room = models.Room(
        room_number=room_number,
        room_type=room_type,
        floor=floor,
        capacity=capacity,
        is_active=True
    )
    db.add(room)
    return room


client = TestClient(app)

def get_token(username, password):
    response = client.post(
        "/api/auth/login",
        data={"username": username, "password": password}
    )
    assert response.status_code == 200
    return response.json()["access_token"]

def test_login():
    response = client.post(
        "/api/auth/login",
        data={"username": "test_admin", "password": "wrongpassword"}
    )
    assert response.status_code == 401
    
    token = get_token("test_admin", "password123")
    assert token is not None

def test_role_based_access():
    # Receptionist token
    recep_token = get_token("test_recep", "password123")
    headers = {"Authorization": f"Bearer {recep_token}"}
    
    # Receptionist tries to create a room
    room_data = {"room_number": "301", "room_type": "Private", "floor": 3, "capacity": 1}
    response = client.post("/api/rooms", json=room_data, headers=headers)
    assert response.status_code == 403  # Forbidden
    
    # Admin token
    admin_token = get_token("test_admin", "password123")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Admin tries to create a room
    response = client.post("/api/rooms", json=room_data, headers=admin_headers)
    assert response.status_code == 201  # Created

def test_booking_and_concurrency():
    recep_token = get_token("test_recep", "password123")
    recep_headers = {"Authorization": f"Bearer {recep_token}"}
    
    # Find room 201 id
    rooms_response = client.get("/api/rooms", headers=recep_headers)
    assert rooms_response.status_code == 200
    rooms = rooms_response.json()
    room_201_id = next(r["id"] for r in rooms if r["room_number"] == "201")
    
    # Book room 201 for today to 3 days later
    check_in = datetime.datetime.utcnow() + datetime.timedelta(days=1)
    check_out = check_in + datetime.timedelta(days=3)
    
    booking_data = {
        "room_id": room_201_id,
        "patient_name": "Test Patient",
        "patient_contact": "9999999999",
        "check_in": check_in.isoformat(),
        "check_out": check_out.isoformat()
    }
    
    # Booking room
    res = client.post("/api/bookings", json=booking_data, headers=recep_headers)
    assert res.status_code == 201
    booking_id = res.json()["id"]
    
    # Try to double-book overlapping dates (exactly same dates)
    res_overlap = client.post("/api/bookings", json=booking_data, headers=recep_headers)
    assert res_overlap.status_code == 400
    assert "not available" in res_overlap.json()["detail"]

    # Try to book overlapping inside window (e.g. check_in + 1 day to check_out + 1 day)
    booking_overlap_data = booking_data.copy()
    booking_overlap_data["check_in"] = (check_in + datetime.timedelta(days=1)).isoformat()
    booking_overlap_data["check_out"] = (check_out + datetime.timedelta(days=1)).isoformat()
    res_overlap2 = client.post("/api/bookings", json=booking_overlap_data, headers=recep_headers)
    assert res_overlap2.status_code == 400
    
    # Cancel the booking
    res_cancel = client.delete(f"/api/bookings/{booking_id}", headers=recep_headers)
    assert res_cancel.status_code == 200
    assert res_cancel.json()["status"] == "Cancelled"
    
    # Try booking again - should succeed now
    res_retry = client.post("/api/bookings", json=booking_data, headers=recep_headers)
    assert res_retry.status_code == 201

def test_maintenance_block():
    admin_token = get_token("test_admin", "password123")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    recep_token = get_token("test_recep", "password123")
    recep_headers = {"Authorization": f"Bearer {recep_token}"}
    
    # Get room 101 id
    rooms_response = client.get("/api/rooms", headers=recep_headers)
    rooms = rooms_response.json()
    room_101_id = next(r["id"] for r in rooms if r["room_number"] == "101")
    
    # Block room 101 for maintenance
    block_start = datetime.datetime.utcnow() + datetime.timedelta(days=5)
    block_end = block_start + datetime.timedelta(days=2)
    
    block_data = {
        "reason": "Painting",
        "start_date": block_start.isoformat(),
        "end_date": block_end.isoformat()
    }
    
    block_res = client.post(f"/api/rooms/{room_101_id}/block", json=block_data, headers=admin_headers)
    assert block_res.status_code == 201
    
    # Try booking room 101 during the maintenance period
    booking_data = {
        "room_id": room_101_id,
        "patient_name": "Block Test Patient",
        "patient_contact": "8888888888",
        "check_in": (block_start + datetime.timedelta(hours=1)).isoformat(),
        "check_out": (block_end - datetime.timedelta(hours=1)).isoformat()
    }
    
    book_res = client.post("/api/bookings", json=booking_data, headers=recep_headers)
    assert book_res.status_code == 400
    assert "not available" in book_res.json()["detail"]
