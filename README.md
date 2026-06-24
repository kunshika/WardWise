# WardWise — Centralized Hospital Room Booking & Occupancy System

> **WardWise** is a real-time, role-based web platform designed for small-to-mid-sized hospitals. It replaces manual, spreadsheet-based room allocation with a conflict-free interface — enabling hospital administrators to manage inventory and receptionists to book rooms in under 30 seconds.
> 
> *Built as a cross-disciplinary portfolio project showcasing both **Product Management (PM)** prioritization and **Software Development Engineering (SDE)** system design.*

---

## 📌 Product Management (PM) Design

### 1. The Core Problem
Hospitals managing room allocation manually (via Excel or paper logs) experience three core failures:
* **Double-Bookings**: Caused by asynchronous updates across multiple staff members.
* **Friction & Delays**: Receptionists must physically check wards or call departments to check availability, increasing patient check-in times.
* **No Audit Trail**: High staff turnover and lack of log records lead to disputes over who allocated which room.

### 2. User Personas
* **Hospital Admin (Ramesh, 42)**: Needs operational oversight, room inventory control, staff management, and a transparent audit trail to resolve allocation disputes.
* **Receptionist (Priya, 27)**: Needs a fast, minimal-click search to find and book available rooms immediately while answering phone calls or greeting incoming patients.

### 3. MVP Prioritization (MoSCoW Framework)
To optimize speed-to-market, the product scope was defined strictly to address the core problem:
* **Must Have**: Role-based authentication (Admin/Receptionist), real-time availability checker, conflict-prevention booking flow, and room blocking for maintenance.
* **Should Have**: Instant confirmation slips and historical audit filters.
* **Could Have (Future)**: Automated SMS notification updates to patients, and interactive utilization reports.
* **Won't Have (MVP)**: Patient billing integration or multi-hospital branch networking.

### 4. Success Metrics (KPIs)
* **Time-to-Book**: Reduced from ~5 minutes (manual search) to **under 30 seconds**.
* **Double-Booking Incident Rate**: **0%** via server-side constraint checks.
* **Staff Onboarding**: Minimal-click dashboard interface requiring zero training.

---

## 🛠️ Software Engineering (SDE) Architecture

### 1. System Architecture
WardWise utilizes a decoupled architecture with a modern Single Page Application (SPA) frontend and a high-performance RESTful API backend:

```
[React SPA Frontend] <--- HTTP / JSON (JWT) ---> [FastAPI Backend] ---> [SQLAlchemy ORM] ---> [SQLite Database]
```

### 2. Database Models
The relational schema is configured to support soft deletions, auditing, and maintenance state intervals:

* **User**: Manages authentication credentials, hashed passwords (native `bcrypt`), and role access permissions (`admin` or `receptionist`).
* **Room**: Stores core details (room number, type: `ICU`, `Private`, `Semi-private`, `General`, floor level, and bed capacity).
* **RoomBlock**: Records room maintenance blocks created by admins, indicating why a room is closed (e.g., cleaning, AC repairs) and the start/end dates.
* **Booking**: Manages patient occupancy schedules, storing patient names, contact numbers, check-in/check-out timestamps, booking status (`Active` or `Cancelled`), and the ID of the receptionist who created it.

### 3. Concurrency & Overlap Prevention (Crucial Engine)
To eliminate double-bookings (the primary technical goal), the backend uses a strict **interval overlapping validation algorithm** executed within a database transaction block:

* **Overlap Logic**: A room is considered **unavailable** during a target window `[T_start, T_end]` if:
  1. An active booking exists where `booking.check_in < T_end` AND `booking.check_out > T_start`.
  2. An active maintenance block exists where `block.start_date < T_end` AND (`block.end_date` is `NULL` or `block.end_date > T_start`).

This prevents race conditions at the database level, returning a clear `400 Bad Request` if a receptionist attempts to book a conflicting slot.

---

## 💎 Key Features & User Interface

* **Elegant Dark Theme**: Customized UI styled with pure CSS (glassmorphism, vibrant badges, and micro-interactions).
* **Admin Inventory Board**: Allows admins to add rooms, review staff lists, deactivate rooms, and block rooms for maintenance.
* **Staff Registration**: Security layers restrict registration of new receptionist accounts to authenticated administrators.
* **Receptionist Search Console**: Real-time availability filter. Receptionists pick a time window and room type to see available rooms instantly.
* **3-Click Booking & Slip**: Click a room -> Fill patient details -> Generate a clean digital booking slip with reference IDs.
* **Historical Audit Trail**: A filterable table log of past, active, and cancelled bookings for tracking usage.

---

## 🚀 Getting Started

### 1. Prerequisites
* Python 3.9+
* Node.js & npm

### 2. Backend Setup
1. Navigate to the backend directory and install Python dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
2. Populate the database with default users, rooms, and blocks:
   ```bash
   python -m backend.app.seed
   ```
3. Start the FastAPI development server:
   ```bash
   python -m uvicorn backend.app.main:app --reload
   ```

### 3. Frontend Setup
1. Navigate to the frontend directory and install npm packages:
   ```bash
   cd ../frontend
   npm install
   ```
2. Run the React development server:
   ```bash
   npm run dev
   ```

### 4. Running Tests
Ensure backend API integrity by running the test suite:
```bash
pytest backend/test_api.py
```

---

## 🔑 Default Accounts (Demo)
Use these pre-configured accounts (pre-filled on the login screen) to explore the system:

* **Administrator**:
  * **Username**: `admin`
  * **Password**: `admin123`
* **Receptionist**:
  * **Username**: `receptionist`
  * **Password**: `receptionist123`
