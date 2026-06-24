import React, { useState, useEffect } from 'react';
import LoginView from './components/LoginView';
import AdminDashboard from './components/AdminDashboard';
import ReceptionistDashboard from './components/ReceptionistDashboard';
import { LogOut, Activity, User, Shield } from 'lucide-react';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('wardwise_token') || null);
  const [user, setUser] = useState(null);
  const [toasts, setToasts] = useState([]);

  // Restore user from token on load
  useEffect(() => {
    if (token) {
      try {
        const tokenParts = token.split('.');
        const payload = JSON.parse(atob(tokenParts[1]));
        
        // Check expiry
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          handleLogout();
          addToast('Session expired. Please log in again.', 'info');
        } else {
          setUser({
            id: payload.user_id,
            username: payload.sub,
            role: payload.role,
          });
        }
      } catch (err) {
        handleLogout();
      }
    }
  }, [token]);

  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleLoginSuccess = (newToken, userData) => {
    localStorage.setItem('wardwise_token', newToken);
    setToken(newToken);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('wardwise_token');
    setToken(null);
    setUser(null);
    addToast('Logged out successfully', 'info');
  };

  return (
    <div className="main-container">
      {/* NAVBAR */}
      <header className="header-bar glass-panel" style={{ padding: '1rem 2rem', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            background: 'var(--primary)',
            color: 'white',
            width: '38px',
            height: '38px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(99, 102, 241, 0.4)'
          }}>
            <Activity size={20} />
          </div>
          <div className="header-title-section">
            <h1 style={{ fontSize: '1.25rem', fontWeight: '700', letterSpacing: '-0.01em', margin: 0 }}>
              WardWise
            </h1>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Hospital Occupancy System
            </span>
          </div>
        </div>

        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
              {user.role === 'admin' ? (
                <Shield size={16} style={{ color: 'var(--primary)' }} />
              ) : (
                <User size={16} style={{ color: 'var(--accent)' }} />
              )}
              <span style={{ color: 'var(--text-secondary)' }}>
                Logged in: <strong style={{ color: 'var(--text-primary)' }}>{user.username}</strong> ({user.role})
              </span>
            </div>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={handleLogout}
              style={{ padding: '0.45rem 0.85rem' }}
            >
              <LogOut size={14} /> Log Out
            </button>
          </div>
        )}
      </header>

      {/* VIEWS */}
      {!token || !user ? (
        <LoginView onLoginSuccess={handleLoginSuccess} addToast={addToast} />
      ) : user.role === 'admin' ? (
        <AdminDashboard token={token} user={user} addToast={addToast} />
      ) : (
        <ReceptionistDashboard token={token} user={user} addToast={addToast} />
      )}

      {/* TOAST NOTIFICATION CONTAINER */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
