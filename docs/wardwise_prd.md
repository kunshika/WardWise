# WardWise — Product Requirements Document

> **Version:** 1.0 (MVP)
> **Author:** Kunshika
> **Status:** Draft
> **Last Updated:** June 2025

---

## Table of Contents

1. [Overview](#1-overview)
2. [Problem Statement](#2-problem-statement)
3. [Goals & Non-Goals](#3-goals--non-goals)
4. [Target Users](#4-target-users)
5. [User Personas](#5-user-personas)
6. [User Stories](#6-user-stories)
7. [Functional Requirements](#7-functional-requirements)
8. [Non-Functional Requirements](#8-non-functional-requirements)
9. [Success Metrics](#9-success-metrics)
10. [Risks & Mitigations](#10-risks--mitigations)
11. [Proposed Timeline](#11-proposed-timeline)
12. [Open Questions](#12-open-questions)

---

## 1. Overview

WardWise is a centralized hospital room booking and management system designed for small-to-mid-sized hospitals. It replaces manual, spreadsheet-based room allocation with a real-time, role-based web platform — enabling hospital admins to manage room inventory and receptionists to make conflict-free bookings in under 30 seconds.

---

## 2. Problem Statement

> *Hospital admins and receptionists lack a centralized, real-time system to manage room availability and bookings — causing conflicts, delays, and poor patient experience.*

Hospitals managing room allocation manually experience three core failures:

- **Double-bookings** caused by non-synchronized spreadsheets or verbal handoffs
- **No real-time availability view** — staff must check physically or call across departments
- **Zero audit trail** — disputes over who booked what cannot be resolved

These failures lead to patient delays, staff frustration, and potential revenue loss from underutilized rooms.

**The insight:** This isn't a staffing problem — it's an information problem. The right system surfaces availability instantly and makes booking a 3-click action.

---

## 3. Goals & Non-Goals

### In Scope (MVP)

- Room CRUD — add, edit, delete rooms
- Real-time availability dashboard
- Room booking by receptionist
- Booking cancellation & modification
- Conflict detection (no double-booking)
- Role-based auth (Admin / Receptionist)
- Booking history with basic filters

### Out of Scope (MVP)

- Patient-facing portal or app
- SMS / email notifications
- Billing or insurance integration
- Multi-hospital / branch support
- Analytics & utilization reports
- Mobile app (web-responsive only)

---

## 4. Target Users

| User | Role | Access Level |
|------|------|--------------|
| Hospital Admin | Manages inventory, views all data, creates staff | Full access |
| Receptionist | Searches availability, creates & cancels bookings | Booking access only |
| Patient | Indirect beneficiary — faster admission experience | No direct access |

---

## 5. User Personas

### Persona 1 — Hospital Admin

**Ramesh Kumar** | 42 yrs | Delhi | Primary User

**Goals:**
- See all room availability at a glance
- Manage room types & capacity
- Prevent double bookings
- View booking history & reports

**Frustrations:**
- Spreadsheets get out of sync across staff
- Can't delegate safely without losing control
- No audit trail when disputes arise

**Tech comfort:** Moderate — uses Excel and WhatsApp daily

---

### Persona 2 — Receptionist

**Priya Sharma** | 27 yrs | Gurugram | Primary User

**Goals:**
- Quickly check room availability
- Book a room for an incoming patient
- Handle cancellations & transfers
- Know which rooms are under cleaning or blocked

**Frustrations:**
- Patients wait while she calls around to check availability
- Finds out a room was already taken after confirming to a patient
- No access to the same information as the admin

**Tech comfort:** High — comfortable with web apps

---

### Persona 3 — Patient

**Anita Verma** | 55 yrs | Faridabad | Indirect User

**Goals:**
- Get admitted quickly without hassle
- Know their room assignment before arriving
- Trust the hospital is organized

**Frustrations:**
- Long waits at the admission desk
- Told "no room available" when rooms exist
- Feels like chaos at the front desk

**Tech comfort:** Low — benefits indirectly via staff efficiency

---

## 6. User Stories

### Priority Legend

| Label | Meaning |
|-------|---------|
| `Must have` | MVP — ship this |
| `Should have` | V1.1 — important but not blocking |
| `Could have` | Future — nice to have |

---

### Hospital Admin

| ID | User Story | Priority |
|----|-----------|----------|
| US-01 | As an **admin**, I want to **add and manage hospital rooms** (type, capacity, floor), so that the system has accurate room inventory. | `Must have` |
| US-02 | As an **admin**, I want to **view all room statuses on a single dashboard** (available, occupied, under maintenance), so that I have full operational visibility. | `Must have` |
| US-03 | As an **admin**, I want to **block a room for maintenance** with a reason and duration, so that staff don't accidentally book unavailable rooms. | `Must have` |
| US-04 | As an **admin**, I want to **view the full booking history** with filters (date, room, staff), so that I can resolve disputes and audit usage. | `Should have` |
| US-05 | As an **admin**, I want to **create staff accounts** with role-based access, so that receptionists can book but not alter room inventory. | `Must have` |

### Receptionist

| ID | User Story | Priority |
|----|-----------|----------|
| US-06 | As a **receptionist**, I want to **search available rooms by type and date**, so that I can find the right room for a patient in under 30 seconds. | `Must have` |
| US-07 | As a **receptionist**, I want to **book a room for a patient** with their name and time slot, so that the allocation is instantly recorded and conflict-free. | `Must have` |
| US-08 | As a **receptionist**, I want to **cancel or modify an existing booking**, so that I can handle patient discharges and transfers without admin involvement. | `Must have` |
| US-09 | As a **receptionist**, I want to **see a confirmation after booking** with booking ID and room details, so that I can communicate this to the patient immediately. | `Should have` |

### Future Scope

| ID | User Story | Priority |
|----|-----------|----------|
| US-10 | As an **admin**, I want to **see room utilization reports** (occupancy %, peak hours), so that I can make data-driven staffing decisions. | `Could have` |
| US-11 | As a **patient**, I want to **receive an SMS confirmation** of my room booking, so that I arrive knowing exactly where to go. | `Could have` |

---

## 7. Functional Requirements

### Authentication & Roles

- Admin and Receptionist log in via username + password (JWT-based session)
- Admin can create, edit, and deactivate receptionist accounts
- Role-based access: Admin has all permissions; Receptionist cannot edit room inventory

### Room Management (Admin only)

- Add room with: room number, type (General / ICU / Private / Semi-private), floor, capacity
- Edit room details; soft-delete (deactivate) rooms
- Block room with reason (Maintenance / Cleaning / Reserved) and optional end date

### Booking Flow (Receptionist)

- Search rooms by type, date, and time slot
- Book room: patient name, contact, check-in / check-out datetime
- System checks for conflicts before confirming — returns error if slot is taken
- On confirmation: generate booking ID, update room status to Occupied
- Cancel booking: room status reverts to Available immediately
- Modify booking: treated as cancel + rebook (with conflict check)

### Dashboard

- Admin view: all rooms, all statuses, color-coded grid
- Receptionist view: available rooms only, filterable by type
- Booking history table with filters: date range, room, staff name

---

## 8. Non-Functional Requirements

- Response time under 500ms for all booking operations
- Concurrent booking conflicts handled at DB level (row-level locking)
- Runs on any modern browser — no app install needed
- All passwords hashed (bcrypt); tokens expire after 8 hours

---

## 9. Success Metrics

| Metric | Target |
|--------|--------|
| Booking completion time | Under 30 seconds (vs ~5 min manual) |
| Double-booking incidents | Zero after go-live |
| Staff adoption rate | >80% of receptionists using daily within 2 weeks |
| System uptime | 99%+ during hospital working hours |
| Booking error rate | Under 1% of all bookings require manual correction |

---

## 10. Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Staff resistance to change from spreadsheets | High | Minimal-click UI; admin champions the rollout |
| Race condition on simultaneous bookings | High | DB-level unique constraint on room+slot; server-side validation |
| Incorrect room data entered initially | Medium | Editable room records; soft-delete instead of hard delete |
| Session timeout during active booking | Low | Auto-save booking draft; clear session expiry message |

---

## 11. Proposed Timeline

| Phase | Timeline | Focus |
|-------|----------|-------|
| Phase 1 | Week 1 | Discovery, PRD, personas, user stories ✅ |
| Phase 2 | Week 1–2 | System design, DB schema, API spec |
| Phase 3 | Week 2–3 | Backend: FastAPI + PostgreSQL, all core APIs |
| Phase 4 | Week 3–4 | Frontend: Admin dashboard, booking flow |
| Phase 5 | Week 4–5 | Testing, case study, portfolio packaging |

---

## 12. Open Questions

These are intentionally left open — in PM interviews, open questions demonstrate you think about edge cases, not just the happy path.

1. Should receptionists be able to see which staff made a booking, or only their own?
2. What happens to a booking if a room is blocked mid-stay — auto-alert or manual resolution?
3. Do we need multi-day bookings (ICU stays) or just same-day slots?

---

*WardWise · Built as a PM + SDE portfolio project · Kunshika*