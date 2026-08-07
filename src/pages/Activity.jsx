import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchComplaints } from '../services/api';
import StatusBadge from '../components/Common/StatusBadge';
import { Clock, ChevronRight } from 'lucide-react';

export default function Activity() {
  const [myIssues, setMyIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivity();
  }, []);

  async function loadActivity() {
    try {
      const data = await fetchComplaints({});
      setMyIssues(data.complaints || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  // Generate mock notifications from complaint data
  const notifications = myIssues.slice(0, 10).map(c => ({
    id: c.id,
    complaint_id: c.complaint_id,
    title: c.title,
    status: c.status,
    message: getNotificationMessage(c),
    time: getTimeAgo(c.updated_at || c.created_at),
    icon: getNotificationIcon(c.status)
  }));

  return (
    <div className="page-container">
      <div className="section-header">
        <h1 className="section-title">Activity</h1>
        <p className="section-subtitle">Track all your civic reports</p>
      </div>

      {loading ? (
        <div style={{ padding: 16 }}>
          {[1,2,3].map(i => (
            <div key={i} className="skeleton" style={{ width: '100%', height: 70, marginBottom: 8, borderRadius: 12 }} />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '3rem', marginBottom: 12 }}>🔔</p>
          <p>No activity yet. Report an issue to get started!</p>
        </div>
      ) : (
        <div>
          {notifications.map((n, i) => (
            <Link
              key={n.id || i}
              to={`/track?id=${n.complaint_id}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', textDecoration: 'none',
                borderBottom: '1px solid var(--border-separator)',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'var(--bg-elevated)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
                flexShrink: 0
              }}>
                {n.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', marginBottom: 2 }}>
                  <strong style={{ color: 'var(--text-primary)' }}>{n.message}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <StatusBadge status={n.status} />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {n.time}
                  </span>
                </div>
              </div>
              <ChevronRight size={16} color="var(--text-muted)" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function getNotificationMessage(c) {
  const messages = {
    submitted: `"${truncate(c.title)}" submitted`,
    ai_verified: `AI verified: ${truncate(c.title)}`,
    department_assigned: `Routed to ${c.department_name || 'department'}`,
    officer_acknowledged: `Officer acknowledged: ${truncate(c.title)}`,
    work_started: `Work started on ${truncate(c.title)}`,
    resolved: `${truncate(c.title)} resolved! Verify?`,
    citizen_verified: `You verified: ${truncate(c.title)}`,
  };
  return messages[c.status] || truncate(c.title);
}

function getNotificationIcon(status) {
  const icons = {
    submitted: '📤', ai_verified: '🤖', department_assigned: '🏢',
    officer_acknowledged: '👮', work_started: '🔧',
    resolved: '✅', citizen_verified: '🎉'
  };
  return icons[status] || '📋';
}

function truncate(str, len = 30) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '...' : str;
}

function getTimeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}
