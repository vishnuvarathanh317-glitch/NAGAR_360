import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, BarChart3, Trophy, Shield, Settings } from 'lucide-react';

export default function Profile() {
  const { user, logout, isOfficer } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <div className="page-container">
      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-avatar">
          {user ? (user.name?.[0] || '👤') : '👤'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>
            {user?.name || 'Guest User'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {user?.email || 'Not signed in'}
          </div>
          {user?.role && (
            <span className="badge" style={{
              marginTop: 6,
              background: isOfficer ? 'rgba(0,149,246,0.2)' : 'rgba(0,200,83,0.2)',
              color: isOfficer ? '#0095f6' : '#00c853'
            }}>
              {user.role.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="profile-stats" style={{ padding: '0 16px 20px', justifyContent: 'center', borderBottom: '1px solid var(--border-separator)' }}>
        <div className="profile-stat">
          <div className="profile-stat__value">—</div>
          <div className="profile-stat__label">Reported</div>
        </div>
        <div className="profile-stat">
          <div className="profile-stat__value">—</div>
          <div className="profile-stat__label">Verified</div>
        </div>
        <div className="profile-stat">
          <div className="profile-stat__value">—</div>
          <div className="profile-stat__label">Supported</div>
        </div>
      </div>

      {/* Menu */}
      <div style={{ padding: '12px 0' }}>
        {[
          { to: '/dashboard', icon: <BarChart3 size={20} />, label: 'Transparency Dashboard' },
          { to: '/performance', icon: <Trophy size={20} />, label: 'Performance Index' },
          ...(isOfficer ? [{ to: '/officer', icon: <Shield size={20} />, label: 'Officer Dashboard' }] : []),
        ].map((item, i) => (
          <Link
            key={i}
            to={item.to}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 16px', textDecoration: 'none',
              color: 'var(--text-primary)', fontSize: '0.9rem',
              borderBottom: '1px solid var(--border-separator)',
              transition: 'background 0.15s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span style={{ color: 'var(--text-muted)' }}>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </div>

      {/* Auth Actions */}
      <div style={{ padding: 16 }}>
        {user ? (
          <button className="btn btn-danger btn--full" onClick={handleLogout}>
            <LogOut size={16} /> Log Out
          </button>
        ) : (
          <Link to="/login" className="btn btn-gradient btn--full">
            Log In
          </Link>
        )}
      </div>
    </div>
  );
}
