import React from 'react';
import { Link } from 'react-router-dom';
import { Bell, BarChart3 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function TopBar() {
  const { user } = useAuth();

  return (
    <header className="top-bar">
      <Link to="/" className="top-bar__logo" style={{ textDecoration: 'none' }}>
        nagar360
      </Link>

      <div className="top-bar__actions">
        <Link to="/dashboard" className="top-bar__icon-btn" title="Transparency Dashboard">
          <BarChart3 size={22} />
        </Link>
        <Link to="/activity" className="top-bar__icon-btn" title="Notifications">
          <Bell size={22} />
          <span className="notification-dot" />
        </Link>
      </div>
    </header>
  );
}
