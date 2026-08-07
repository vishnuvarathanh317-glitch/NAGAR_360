import React from 'react';

const STATUS_MAP = {
  submitted: { label: 'Submitted', bg: 'rgba(0,149,246,0.15)', color: '#0095f6' },
  ai_verified: { label: 'AI Verified', bg: 'rgba(138,43,226,0.15)', color: '#a855f7' },
  department_assigned: { label: 'Dept Assigned', bg: 'rgba(255,171,0,0.15)', color: '#ffab00' },
  officer_acknowledged: { label: 'Acknowledged', bg: 'rgba(0,188,212,0.15)', color: '#00bcd4' },
  work_started: { label: 'Work Started', bg: 'rgba(255,109,0,0.15)', color: '#ff6d00' },
  resolved: { label: 'Resolved', bg: 'rgba(0,200,83,0.15)', color: '#00c853' },
  citizen_verified: { label: 'Verified ✓', bg: 'rgba(0,200,83,0.2)', color: '#00e676' },
  reopened: { label: 'Reopened', bg: 'rgba(237,73,86,0.15)', color: '#ed4956' },
  closed: { label: 'Closed', bg: 'rgba(115,115,115,0.15)', color: '#737373' },
};

export default function StatusBadge({ status }) {
  const config = STATUS_MAP[status] || { label: status, bg: 'rgba(115,115,115,0.15)', color: '#737373' };

  return (
    <span className="status-badge" style={{ background: config.bg, color: config.color }}>
      {config.label}
    </span>
  );
}
