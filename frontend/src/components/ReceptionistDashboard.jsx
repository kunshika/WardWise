import React, { useState, useEffect } from 'react';
import { 
  Search, Calendar, Plus, X, ListFilter, User, Phone, CheckCircle, FileText, Ban, Edit, MapPin, AlertCircle
} from 'lucide-react';

export default function ReceptionistDashboard({ token, user, addToast }) {
  const [activeTab, setActiveTab] = useState('book'); // 'book', 'active-bookings'
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search filter states
  const [filterType, setFilterType] = useState('');
  const [filterCheckIn, setFilterCheckIn] = useState('');
  const [filterCheckOut, setFilterCheckOut] = useState('');
  
  // Modals
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [selectedBookingForModify, setSelectedBookingForModify] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [bookingConfirmation, setBookingConfirmation] = useState(null);

  // Form states
  const [patientName, setPatientName] = useState('');
  const [patientContact, setPatientContact] = useState('');
  const [modifyDates, setModifyDates] = useState({ check_in: '', check_out: '' });

  // Load default dates (today to tomorrow)
  useEffect(() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Format for datetime-local (yyyy-MM-ddThh:mm)
    const formatDateTimeLocal = (date) => {
      const pad = (num) => String(num).padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T12:00`;
    };

    setFilterCheckIn(formatDateTimeLocal(today));
    setFilterCheckOut(formatDateTimeLocal(tomorrow));
  }, []);

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  useEffect(() => {
    if (filterCheckIn && filterCheckOut) {
      searchAvailableRooms();
    }
  }, [filterCheckIn, filterCheckOut, filterType]);

  useEffect(() => {
    if (activeTab === 'active-bookings') {
      fetchActiveBookings();
    }
  }, [activeTab]);

  const searchAvailableRooms = async () => {
    setLoading(true);
    try {
      let url = 'http://localhost:8000/api/rooms';
      const params = new URLSearchParams();
      if (filterCheckIn) params.append('check_in', new Date(filterCheckIn).toISOString());
      if (filterCheckOut) params.append('check_out', new Date(filterCheckOut).toISOString());
      if (filterType) params.append('room_type', filterType);
      
      params.append('available_only', 'true');
      
      url += `?${params.toString()}`;

      const response = await fetch(url, { headers: authHeaders });
      if (!response.ok) throw new Error('Failed to search available rooms');
      const data = await response.json();
      setRooms(data);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveBookings = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/bookings?status=Active', { headers: authHeaders });
      if (!response.ok) throw new Error('Failed to fetch bookings');
      const data = await response.json();
      setBookings(data);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBookRoom = (room) => {
    setSelectedRoom(room);
    setPatientName('');
    setPatientContact('');
    setShowBookingModal(true);
  };

  const submitBooking = async (e) => {
    e.preventDefault();
    if (!patientName || !patientContact) {
      addToast('Please provide patient name and contact', 'error');
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/api/bookings', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          room_id: selectedRoom.id,
          patient_name: patientName,
          patient_contact: patientContact,
          check_in: new Date(filterCheckIn).toISOString(),
          check_out: new Date(filterCheckOut).toISOString()
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Booking failed');
      }

      const data = await response.json();
      setBookingConfirmation(data);
      setShowBookingModal(false);
      setShowConfirmModal(true);
      searchAvailableRooms();
      addToast('Room booked successfully!', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    try {
      const response = await fetch(`http://localhost:8000/api/bookings/${bookingId}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      if (!response.ok) throw new Error('Failed to cancel booking');
      addToast('Booking cancelled', 'success');
      fetchActiveBookings();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleOpenModifyModal = (booking) => {
    // Convert dates for local HTML format
    const formatToLocal = (isoString) => {
      const d = new Date(isoString);
      const pad = (num) => String(num).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    setSelectedBookingForModify(booking);
    setModifyDates({
      check_in: formatToLocal(booking.check_in),
      check_out: formatToLocal(booking.check_out)
    });
    setShowModifyModal(true);
  };

  const submitModifyBooking = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`http://localhost:8000/api/bookings/${selectedBookingForModify.id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
          check_in: new Date(modifyDates.check_in).toISOString(),
          check_out: new Date(modifyDates.check_out).toISOString()
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to modify booking');
      }

      addToast('Booking dates modified successfully', 'success');
      setShowModifyModal(false);
      fetchActiveBookings();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  return (
    <div>
      <div className="tabs-container">
        <button 
          className={`tab-btn ${activeTab === 'book' ? 'active' : ''}`}
          onClick={() => setActiveTab('book')}
        >
          <Search size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
          Book Room
        </button>
        <button 
          className={`tab-btn ${activeTab === 'active-bookings' ? 'active' : ''}`}
          onClick={() => setActiveTab('active-bookings')}
        >
          <FileText size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
          Active Bookings
        </button>
      </div>

      {/* --- TAB 1: BOOK ROOM FLOW --- */}
      {activeTab === 'book' && (
        <div>
          {/* SEARCH CRITERIA PANEL */}
          <div className="glass-panel" style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ListFilter size={18} /> Search Availability
            </h3>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1.25rem'
            }}>
              <div className="form-group">
                <label className="form-label" htmlFor="check-in-date">Check-In</label>
                <input 
                  id="check-in-date"
                  type="datetime-local" 
                  className="form-input"
                  value={filterCheckIn}
                  onChange={(e) => setFilterCheckIn(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="check-out-date">Check-Out</label>
                <input 
                  id="check-out-date"
                  type="datetime-local" 
                  className="form-input"
                  value={filterCheckOut}
                  onChange={(e) => setFilterCheckOut(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="filter-type">Room Type</label>
                <select 
                  id="filter-type"
                  className="form-select"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="">All Types</option>
                  <option value="General">General Ward</option>
                  <option value="ICU">ICU</option>
                  <option value="Private">Private Suite</option>
                  <option value="Semi-private">Semi-Private Room</option>
                </select>
              </div>
            </div>
          </div>

          {/* ROOM LISTINGS */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
              Checking available rooms...
            </div>
          ) : (
            <div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>
                Available Rooms ({rooms.length})
              </h3>
              
              {rooms.length === 0 ? (
                <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  <AlertCircle size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
                  <p>No rooms available for the selected dates and criteria.</p>
                  <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Try adjusting the dates or choosing a different room type.</p>
                </div>
              ) : (
                <div className="dashboard-grid">
                  {rooms.map(room => (
                    <div key={room.id} className="glass-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div>
                          <span className="form-label" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <MapPin size={10} /> Floor {room.floor}
                          </span>
                          <h4 style={{ fontSize: '1.5rem', margin: '0.2rem 0' }}>Room {room.room_number}</h4>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'flex-end' }}>
                          <span className={`badge badge-available`}>
                            Available
                          </span>
                          <span className={`badge badge-${room.room_type.replace('-', '').toLowerCase()}`}>
                            {room.room_type}
                          </span>
                        </div>
                      </div>

                      <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                          <span>Max Capacity:</span>
                          <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{room.capacity} Beds</span>
                        </div>
                      </div>

                      <button 
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '0.65rem' }}
                        onClick={() => handleBookRoom(room)}
                      >
                        <Plus size={16} /> Book Now
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* --- TAB 2: ACTIVE BOOKINGS --- */}
      {activeTab === 'active-bookings' && (
        <div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Current Active Stays</h3>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
              Loading bookings...
            </div>
          ) : bookings.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <p>No active bookings at the moment.</p>
            </div>
          ) : (
            <div className="custom-table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Booking ID</th>
                    <th>Room</th>
                    <th>Patient Name</th>
                    <th>Patient Contact</th>
                    <th>Check-In</th>
                    <th>Check-Out</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(booking => (
                    <tr key={booking.id}>
                      <td style={{ fontWeight: '600' }}>#{booking.id}</td>
                      <td>Room {booking.room_id}</td> {/* Backend should match room details but for MVP we show ID or fetch */}
                      <td>{booking.patient_name}</td>
                      <td>{booking.patient_contact}</td>
                      <td>{new Date(booking.check_in).toLocaleDateString()}</td>
                      <td>{new Date(booking.check_out).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.35rem 0.5rem' }}
                            onClick={() => handleOpenModifyModal(booking)}
                          >
                            <Edit size={12} /> Modify
                          </button>
                          <button 
                            className="btn btn-danger btn-sm"
                            style={{ padding: '0.35rem 0.5rem' }}
                            onClick={() => handleCancelBooking(booking.id)}
                          >
                            <Ban size={12} /> Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* --- MODAL: CREATE BOOKING --- */}
      {showBookingModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3>Book Room {selectedRoom?.room_number}</h3>
              <button className="btn btn-secondary" style={{ padding: '0.25rem' }} onClick={() => setShowBookingModal(false)}>
                <X size={18} />
              </button>
            </div>
            
            <div style={{ 
              background: 'var(--primary-light)', 
              padding: '1rem', 
              borderRadius: 'var(--radius-md)', 
              marginBottom: '1.5rem',
              fontSize: '0.85rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Room Type:</span>
                <span style={{ fontWeight: '600' }}>{selectedRoom?.room_type}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Check-in:</span>
                <span style={{ fontWeight: '600' }}>{new Date(filterCheckIn).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Check-out:</span>
                <span style={{ fontWeight: '600' }}>{new Date(filterCheckOut).toLocaleString()}</span>
              </div>
            </div>

            <form onSubmit={submitBooking}>
              <div className="form-group">
                <label className="form-label" htmlFor="patient-name">Patient Full Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    id="patient-name"
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Ramesh Kumar"
                    style={{ paddingLeft: '2.25rem', width: '100%' }}
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" htmlFor="patient-contact">Contact Number</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    id="patient-contact"
                    type="tel" 
                    className="form-input" 
                    placeholder="e.g. +91 98765 43210"
                    style={{ paddingLeft: '2.25rem', width: '100%' }}
                    value={patientContact}
                    onChange={(e) => setPatientContact(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowBookingModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Confirm Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: BOOKING CONFIRMATION SLIP --- */}
      {showConfirmModal && bookingConfirmation && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ textAlign: 'center', padding: '2.5rem' }}>
            <div style={{
              background: 'var(--success-light)',
              color: 'var(--success)',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.25rem'
            }}>
              <CheckCircle size={32} />
            </div>

            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Booking Confirmed!</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
              The patient admission record has been filed successfully.
            </p>

            <div style={{ 
              background: 'var(--bg-secondary)', 
              border: '1px solid var(--border-color)', 
              borderRadius: 'var(--radius-md)', 
              padding: '1.25rem', 
              textAlign: 'left',
              fontSize: '0.9rem',
              marginBottom: '2rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Booking ID:</span>
                <span style={{ fontWeight: '700', color: 'var(--primary)' }}>#{bookingConfirmation.id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Patient Name:</span>
                <span style={{ fontWeight: '600' }}>{bookingConfirmation.patient_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Room Assigned:</span>
                <span style={{ fontWeight: '600' }}>Room {selectedRoom?.room_number}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Check-in:</span>
                <span>{new Date(bookingConfirmation.check_in).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Check-out:</span>
                <span>{new Date(bookingConfirmation.check_out).toLocaleString()}</span>
              </div>
            </div>

            <button 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '0.8rem' }}
              onClick={() => {
                setShowConfirmModal(false);
                setBookingConfirmation(null);
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* --- MODAL: MODIFY BOOKING DATES --- */}
      {showModifyModal && selectedBookingForModify && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3>Modify Booking Dates</h3>
              <button className="btn btn-secondary" style={{ padding: '0.25rem' }} onClick={() => setShowModifyModal(false)}>
                <X size={18} />
              </button>
            </div>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Update Check-in and Check-out dates for patient <strong>{selectedBookingForModify.patient_name}</strong> (Room {selectedBookingForModify.room_id}).
            </p>

            <form onSubmit={submitModifyBooking}>
              <div className="form-group">
                <label className="form-label" htmlFor="modify-checkin">New Check-In</label>
                <input 
                  id="modify-checkin"
                  type="datetime-local" 
                  className="form-input" 
                  value={modifyDates.check_in}
                  onChange={(e) => setModifyDates({...modifyDates, check_in: e.target.value})}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" htmlFor="modify-checkout">New Check-Out</label>
                <input 
                  id="modify-checkout"
                  type="datetime-local" 
                  className="form-input" 
                  value={modifyDates.check_out}
                  onChange={(e) => setModifyDates({...modifyDates, check_out: e.target.value})}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModifyModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Confirm Modification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
