import React, { useState, useEffect } from 'react';
import { 
  Layers, Plus, Trash2, ShieldCheck, UserPlus, FileText, Wrench, Calendar, X, Users, Settings, UserMinus, Search, Ban
} from 'lucide-react';

export default function AdminDashboard({ token, user, addToast }) {
  const [activeTab, setActiveTab] = useState('rooms'); // 'rooms', 'staff', 'bookings'
  const [rooms, setRooms] = useState([]);
  const [staff, setStaff] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showBlockRoomModal, setShowBlockRoomModal] = useState(false);
  const [selectedRoomForBlock, setSelectedRoomForBlock] = useState(null);

  // Form states
  const [newRoom, setNewRoom] = useState({ room_number: '', room_type: 'General', floor: 1, capacity: 1 });
  const [newStaff, setNewStaff] = useState({ username: '', password: '', role: 'receptionist' });
  const [blockDetails, setBlockDetails] = useState({ reason: '', start_date: '', end_date: '' });

  // Filters for Booking Audit
  const [bookingFilterSearch, setBookingFilterSearch] = useState('');
  const [bookingFilterStatus, setBookingFilterStatus] = useState('');

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    if (activeTab === 'rooms') fetchRooms();
    if (activeTab === 'staff') fetchStaff();
    if (activeTab === 'bookings') fetchBookings();
  }, [activeTab]);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/rooms', { headers: authHeaders });
      if (!response.ok) throw new Error('Failed to fetch rooms');
      const data = await response.json();
      setRooms(data);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/users', { headers: authHeaders });
      if (!response.ok) throw new Error('Failed to fetch staff list');
      const data = await response.json();
      setStaff(data);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    setLoading(true);
    try {
      let url = 'http://localhost:8000/api/bookings';
      const params = new URLSearchParams();
      if (bookingFilterSearch) params.append('search', bookingFilterSearch);
      if (bookingFilterStatus) params.append('status', bookingFilterStatus);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url, { headers: authHeaders });
      if (!response.ok) throw new Error('Failed to fetch bookings');
      const data = await response.json();
      setBookings(data);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Trigger booking search on filter change
  useEffect(() => {
    if (activeTab === 'bookings') {
      fetchBookings();
    }
  }, [bookingFilterSearch, bookingFilterStatus]);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoom.room_number || !newRoom.floor || !newRoom.capacity) {
      addToast('Please fill all room parameters', 'error');
      return;
    }
    try {
      const response = await fetch('http://localhost:8000/api/rooms', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          room_number: newRoom.room_number,
          room_type: newRoom.room_type,
          floor: parseInt(newRoom.floor),
          capacity: parseInt(newRoom.capacity)
        })
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to create room');
      }
      addToast(`Room ${newRoom.room_number} added successfully`, 'success');
      setShowAddRoomModal(false);
      setNewRoom({ room_number: '', room_type: 'General', floor: 1, capacity: 1 });
      fetchRooms();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!newStaff.username || !newStaff.password) {
      addToast('Please fill all staff parameters', 'error');
      return;
    }
    try {
      const response = await fetch('http://localhost:8000/api/users', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(newStaff)
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to create staff account');
      }
      addToast(`Staff account ${newStaff.username} created`, 'success');
      setShowAddStaffModal(false);
      setNewStaff({ username: '', password: '', role: 'receptionist' });
      fetchStaff();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleBlockRoom = async (e) => {
    e.preventDefault();
    if (!blockDetails.reason || !blockDetails.start_date) {
      addToast('Please provide a reason and start date', 'error');
      return;
    }
    try {
      const end = blockDetails.end_date ? new Date(blockDetails.end_date).toISOString() : null;
      const response = await fetch(`http://localhost:8000/api/rooms/${selectedRoomForBlock.id}/block`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          reason: blockDetails.reason,
          start_date: new Date(blockDetails.start_date).toISOString(),
          end_date: end
        })
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to block room');
      }
      addToast(`Room ${selectedRoomForBlock.room_number} blocked for maintenance`, 'success');
      setShowBlockRoomModal(false);
      setBlockDetails({ reason: '', start_date: '', end_date: '' });
      setSelectedRoomForBlock(null);
      fetchRooms();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleUnblockRoom = async (roomId, blockId) => {
    try {
      const response = await fetch(`http://localhost:8000/api/rooms/${roomId}/block/${blockId}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      if (!response.ok) throw new Error('Failed to unblock room');
      addToast('Room unblocked successfully', 'success');
      fetchRooms();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleDeactivateRoom = async (roomId, roomNumber) => {
    if (!window.confirm(`Are you sure you want to deactivate Room ${roomNumber}?`)) return;
    try {
      const response = await fetch(`http://localhost:8000/api/rooms/${roomId}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      if (!response.ok) throw new Error('Failed to deactivate room');
      addToast(`Room ${roomNumber} deactivated`, 'success');
      fetchRooms();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleToggleUserActive = async (targetUser) => {
    try {
      const response = await fetch(`http://localhost:8000/api/users/${targetUser.id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
          is_active: !targetUser.is_active
        })
      });
      if (!response.ok) throw new Error('Failed to change user status');
      addToast(`Account status updated for ${targetUser.username}`, 'success');
      fetchStaff();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  return (
    <div>
      <div className="tabs-container">
        <button 
          className={`tab-btn ${activeTab === 'rooms' ? 'active' : ''}`}
          onClick={() => setActiveTab('rooms')}
        >
          <Layers size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
          Room Inventory
        </button>
        <button 
          className={`tab-btn ${activeTab === 'staff' ? 'active' : ''}`}
          onClick={() => setActiveTab('staff')}
        >
          <Users size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
          Staff Management
        </button>
        <button 
          className={`tab-btn ${activeTab === 'bookings' ? 'active' : ''}`}
          onClick={() => setActiveTab('bookings')}
        >
          <FileText size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
          Booking Audit
        </button>
      </div>

      {/* LOADING INDICATOR */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-secondary)' }}>
          Loading details...
        </div>
      )}

      {/* --- TAB 1: ROOM INVENTORY --- */}
      {activeTab === 'rooms' && !loading && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem' }}>Room Grid Summary</h3>
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => setShowAddRoomModal(true)}
            >
              <Plus size={16} /> Add Room
            </button>
          </div>

          <div className="dashboard-grid">
            {rooms.map(room => {
              const activeBlock = room.blocks.find(b => b.is_active);
              return (
                <div key={room.id} className="glass-card" style={{ opacity: room.is_active ? 1 : 0.5 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <span className="form-label" style={{ fontSize: '0.8rem' }}>Floor {room.floor}</span>
                      <h4 style={{ fontSize: '1.5rem', margin: '0.2rem 0' }}>Room {room.room_number}</h4>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'flex-end' }}>
                      <span className={`badge badge-${room.status.toLowerCase()}`}>
                        {room.status}
                      </span>
                      <span className={`badge badge-${room.room_type.replace('-', '').toLowerCase()}`}>
                        {room.room_type}
                      </span>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <span>Capacity:</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{room.capacity} Beds</span>
                    </div>
                    {activeBlock && (
                      <div style={{ 
                        marginTop: '0.5rem', 
                        padding: '0.5rem', 
                        background: 'rgba(245, 158, 11, 0.05)', 
                        border: '1px solid rgba(245, 158, 11, 0.1)', 
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.8rem' 
                      }}>
                        <span style={{ color: 'var(--warning)', fontWeight: '600' }}>Block Reason: </span>
                        {activeBlock.reason}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                    {room.is_active && (
                      <>
                        {room.status === 'Maintenance' && activeBlock ? (
                          <button 
                            className="btn btn-secondary btn-sm"
                            style={{ flex: 1, fontSize: '0.8rem' }}
                            onClick={() => handleUnblockRoom(room.id, activeBlock.id)}
                          >
                            Unblock
                          </button>
                        ) : (
                          <button 
                            className="btn btn-secondary btn-sm"
                            style={{ flex: 1, fontSize: '0.8rem' }}
                            onClick={() => {
                              setSelectedRoomForBlock(room);
                              setShowBlockRoomModal(true);
                            }}
                          >
                            <Wrench size={12} /> Block
                          </button>
                        )}
                        <button 
                          className="btn btn-danger btn-sm"
                          style={{ padding: '0.5rem' }}
                          onClick={() => handleDeactivateRoom(room.id, room.room_number)}
                          title="Deactivate Room"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                    {!room.is_active && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '0.35rem 0' }}>
                        Deactivated Room
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- TAB 2: STAFF MANAGEMENT --- */}
      {activeTab === 'staff' && !loading && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem' }}>Hospital Staff Accounts</h3>
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => setShowAddStaffModal(true)}
            >
              <UserPlus size={16} /> Create Staff
            </button>
          </div>

          <div className="custom-table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.map(member => (
                  <tr key={member.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ 
                          width: '8px', 
                          height: '8px', 
                          borderRadius: '50%', 
                          background: member.is_active ? 'var(--success)' : 'var(--text-muted)' 
                        }}></span>
                        {member.username}
                      </div>
                    </td>
                    <td>
                      <span style={{ textTransform: 'capitalize' }}>{member.role}</span>
                    </td>
                    <td>
                      <span className={`badge badge-${member.is_active ? 'available' : 'occupied'}`}>
                        {member.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      {member.username !== user.username ? (
                        <button 
                          className={`btn ${member.is_active ? 'btn-secondary' : 'btn-accent'} btn-sm`}
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                          onClick={() => handleToggleUserActive(member)}
                        >
                          {member.is_active ? 'Deactivate' : 'Reactivate'}
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>(Current Admin)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 3: BOOKING AUDIT TRAIL --- */}
      {activeTab === 'bookings' && !loading && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.25rem' }}>Historical Audit Log</h3>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search patient name..."
                  className="form-input btn-sm"
                  style={{ paddingLeft: '2.25rem', width: '220px', fontSize: '0.85rem' }}
                  value={bookingFilterSearch}
                  onChange={(e) => setBookingFilterSearch(e.target.value)}
                />
              </div>
              <select
                className="form-select btn-sm"
                style={{ fontSize: '0.85rem' }}
                value={bookingFilterStatus}
                onChange={(e) => setBookingFilterStatus(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

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
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                      No bookings found matching filters.
                    </td>
                  </tr>
                ) : (
                  bookings.map(booking => (
                    <tr key={booking.id}>
                      <td style={{ fontWeight: '600' }}>#{booking.id}</td>
                      <td>Room {rooms.find(r => r.id === booking.room_id)?.room_number || booking.room_id}</td>
                      <td>{booking.patient_name}</td>
                      <td>{booking.patient_contact}</td>
                      <td>{new Date(booking.check_in).toLocaleDateString()}</td>
                      <td>{new Date(booking.check_out).toLocaleDateString()}</td>
                      <td>
                        <span className={`badge badge-${booking.status.toLowerCase()}`}>
                          {booking.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- MODAL: ADD ROOM --- */}
      {showAddRoomModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3>Add Hospital Room</h3>
              <button className="btn btn-secondary" style={{ padding: '0.25rem' }} onClick={() => setShowAddRoomModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateRoom}>
              <div className="form-group">
                <label className="form-label" htmlFor="room-number">Room Number</label>
                <input 
                  id="room-number"
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. 101" 
                  value={newRoom.room_number}
                  onChange={(e) => setNewRoom({...newRoom, room_number: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="room-type">Room Type</label>
                <select 
                  id="room-type"
                  className="form-select"
                  value={newRoom.room_type}
                  onChange={(e) => setNewRoom({...newRoom, room_type: e.target.value})}
                >
                  <option value="General">General Ward</option>
                  <option value="ICU">ICU</option>
                  <option value="Private">Private Suite</option>
                  <option value="Semi-private">Semi-Private Room</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" htmlFor="floor">Floor</label>
                  <input 
                    id="floor"
                    type="number" 
                    className="form-input" 
                    value={newRoom.floor}
                    onChange={(e) => setNewRoom({...newRoom, floor: e.target.value})}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" htmlFor="capacity">Capacity (Beds)</label>
                  <input 
                    id="capacity"
                    type="number" 
                    className="form-input" 
                    value={newRoom.capacity}
                    onChange={(e) => setNewRoom({...newRoom, capacity: e.target.value})}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowAddRoomModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Create Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: CREATE STAFF --- */}
      {showAddStaffModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3>Create Staff Account</h3>
              <button className="btn btn-secondary" style={{ padding: '0.25rem' }} onClick={() => setShowAddStaffModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateStaff}>
              <div className="form-group">
                <label className="form-label" htmlFor="username">Username</label>
                <input 
                  id="username"
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. priya_receptionist" 
                  value={newStaff.username}
                  onChange={(e) => setNewStaff({...newStaff, username: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="password">Password</label>
                <input 
                  id="password"
                  type="password" 
                  className="form-input" 
                  placeholder="Enter secure password" 
                  value={newStaff.password}
                  onChange={(e) => setNewStaff({...newStaff, password: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="role">Role</label>
                <select 
                  id="role"
                  className="form-select"
                  value={newStaff.role}
                  onChange={(e) => setNewStaff({...newStaff, role: e.target.value})}
                >
                  <option value="receptionist">Receptionist</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowAddStaffModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: BLOCK ROOM FOR MAINTENANCE --- */}
      {showBlockRoomModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3>Block Room {selectedRoomForBlock?.room_number}</h3>
              <button className="btn btn-secondary" style={{ padding: '0.25rem' }} onClick={() => setShowBlockRoomModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleBlockRoom}>
              <div className="form-group">
                <label className="form-label" htmlFor="block-reason">Reason</label>
                <input 
                  id="block-reason"
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Deep Cleaning / AC Maintenance" 
                  value={blockDetails.reason}
                  onChange={(e) => setBlockDetails({...blockDetails, reason: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="block-start">Start Date</label>
                <input 
                  id="block-start"
                  type="datetime-local" 
                  className="form-input" 
                  value={blockDetails.start_date}
                  onChange={(e) => setBlockDetails({...blockDetails, start_date: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="block-end">End Date (Optional)</label>
                <input 
                  id="block-end"
                  type="datetime-local" 
                  className="form-input" 
                  value={blockDetails.end_date}
                  onChange={(e) => setBlockDetails({...blockDetails, end_date: e.target.value})}
                />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  Leave blank to block indefinitely.
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowBlockRoomModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Confirm Block
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
