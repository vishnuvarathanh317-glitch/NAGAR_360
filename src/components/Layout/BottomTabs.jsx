import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Compass, Plus, Activity, User } from 'lucide-react';

const tabs = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/explore', icon: Compass, label: 'Explore' },
  { path: '/report', icon: null, label: 'Report' },
  { path: '/activity', icon: Activity, label: 'Activity' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export default function BottomTabs() {
  const location = useLocation();

  return (
    <nav className="bottom-tabs">
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path;

        if (tab.label === 'Report') {
          return (
            <Link key={tab.path} to={tab.path} className="tab-item tab-item--create">
              <div className="tab-create-btn">
                <Plus size={22} strokeWidth={2.5} />
              </div>
            </Link>
          );
        }

        const Icon = tab.icon;
        return (
          <Link
            key={tab.path}
            to={tab.path}
            className={`tab-item ${isActive ? 'tab-item--active' : ''}`}
          >
            <Icon size={24} strokeWidth={isActive ? 2.5 : 1.5} />
            <span className="tab-item__label">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
