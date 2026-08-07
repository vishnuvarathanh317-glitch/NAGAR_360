import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { fetchOfficerQueue, updateOfficerStatus, resolveComplaintWithProof } from '../services/api';
import StatusBadge from '../components/Common/StatusBadge';
import PriorityBadge from '../components/Common/PriorityBadge';
import SlaTimer from '../components/Common/SlaTimer';
import StatCard from '../components/Common/StatCard';
import { Upload, CheckCircle, Play, Eye } from 'lucide-react';

export default function OfficerDashboard() {
  const { user, isOfficer } = useAuth();
  const navigate = useNavigate();
  const [queue, setQueue] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [afterImage, setAfterImage] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    if (!isOfficer) {
      navigate('/login');
      return;
    }
    loadQueue();
  }, [isOfficer]);

  async function loadQueue() {
    try {
      const data = await fetchOfficerQueue();
      setQueue(data.complaints || []);
      setCounts(data.counts || {});
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  async function handleStatusUpdate(id, status) {
    setActionLoading(true);
    try {
      await updateOfficerStatus(id, status, `Status updated to ${status}`);
      await loadQueue();
      setSelected(null);
    } catch (err) {
      console.error(err);
    }
    setActionLoading(false);
  }

  async function handleResolve(id) {
    setActionLoading(true);
    try {
      const formData = new FormData();
      formData.append('resolutionNotes', resolveNotes || 'Work completed');
      formData.append('workDescription', 'Resolution proof provided');
      if (afterImage) formData.append('afterImage', afterImage);

      await resolveComplaintWithProof(id, formData);
      await loadQueue();
      setSelected(null);
      setResolveNotes('');
      setAfterImage(null);
    } catch (err) {
      console.error(err);
    }
    setActionLoading(false);
  }

  if (!isOfficer) return null;

  return (
    <div className="page-container page-container--wide">
      <div className="page-header">
        <h1 className="page-header__title">👮 Officer Dashboard</h1>
        <p className="page-header__subtitle">
          Welcome, {user?.name || 'Officer'}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid">
        <StatCard title="New" value={counts.new || 0} color="blue" />
        <StatCard title="In Progress" value={counts.inProgress || 0} color="cyan" />
        <StatCard title="Overdue" value={counts.overdue || 0} color="red" />
        <StatCard title="Resolved" value={counts.resolved || 0} color="green" />
      </div>

      {/* Queue */}
      <div className="section-header">
        <h2 className="section-title" style={{ fontSize: '0.95rem' }}>
          Active Queue ({queue.filter(c => c.status !== 'resolved' && c.status !== 'citizen_verified').length})
        </h2>
      </div>

      <div style={{ padding: '0 16px 24px' }}>
        {loading ? (
          [1,2,3].map(i => (
            <div key={i} className="skeleton" style={{ height: 100, marginBottom: 12, borderRadius: 16 }} />
          ))
        ) : queue.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            No complaints in queue
          </div>
        ) : (
          queue.map((c, i) => {
            const isOverdue = c.slaStatus?.isOverdue || c.is_breached;
            const isSelected = selected === c.id;

            return (
              <div
                key={c.id || i}
                className={`queue-card animate-in ${isOverdue ? 'queue-card--overdue' : ''}`}
                style={{ animationDelay: `${i * 0.05}s` }}
                onClick={() => setSelected(isSelected ? null : c.id)}
              >
                <div className="queue-card__top">
                  <div className="queue-card__id">{c.complaint_id}</div>
                  <PriorityBadge priority={c.severity || c.priority} />
                </div>
                <div className="queue-card__title">{c.title}</div>
                <div className="queue-card__location">
                  📍 {c.address || c.ward || c.city || 'Unknown'}
                </div>

                <div className="queue-card__footer">
                  <StatusBadge status={c.status} />
                  {c.deadline && (
                    <SlaTimer deadline={c.deadline} isBreached={c.is_breached} />
                  )}
                </div>

                {/* Action Panel */}
                {isSelected && (
                  <div style={{
                    marginTop: 12, paddingTop: 12,
                    borderTop: '1px solid var(--border-subtle)',
                    display: 'flex', flexDirection: 'column', gap: 8
                  }}
                    onClick={e => e.stopPropagation()}
                  >
                    {(c.status === 'department_assigned' || c.status === 'ai_verified') && (
                      <button
                        className="btn btn-primary btn--full btn--sm"
                        onClick={() => handleStatusUpdate(c.id, 'officer_acknowledged')}
                        disabled={actionLoading}
                      >
                        <Eye size={16} /> Acknowledge
                      </button>
                    )}

                    {c.status === 'officer_acknowledged' && (
                      <button
                        className="btn btn-primary btn--full btn--sm"
                        onClick={() => handleStatusUpdate(c.id, 'work_started')}
                        disabled={actionLoading}
                      >
                        <Play size={16} /> Start Work
                      </button>
                    )}

                    {(c.status === 'work_started' || c.status === 'officer_acknowledged') && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <input
                          className="input-field"
                          placeholder="Resolution notes..."
                          value={resolveNotes}
                          onChange={e => setResolveNotes(e.target.value)}
                        />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            className="btn btn-secondary btn--sm"
                            onClick={() => fileRef.current?.click()}
                          >
                            <Upload size={14} />
                            {afterImage ? 'Photo ✓' : 'After Photo'}
                          </button>
                          <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={e => setAfterImage(e.target.files?.[0])}
                          />
                          <button
                            className="btn btn-success btn--sm"
                            style={{ flex: 1 }}
                            onClick={() => handleResolve(c.id)}
                            disabled={actionLoading}
                          >
                            <CheckCircle size={14} /> Mark Resolved
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
