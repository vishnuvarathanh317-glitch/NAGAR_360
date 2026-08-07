import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, CheckCircle2, Circle, Clock, MapPin, Building2, Sparkles, ThumbsUp } from 'lucide-react';
import { trackComplaint, verifyComplaint, upvoteComplaint } from '../services/api';
import StatusBadge from '../components/Common/StatusBadge';
import PriorityBadge from '../components/Common/PriorityBadge';
import SlaTimer from '../components/Common/SlaTimer';
import AiResultCard from '../components/Common/AiResultCard';

const API_BASE = '';

const STATUS_STEPS = [
  { key: 'submitted', label: 'Submitted', icon: '📤' },
  { key: 'ai_verified', label: 'AI Verified', icon: '🤖' },
  { key: 'department_assigned', label: 'Dept Assigned', icon: '🏢' },
  { key: 'officer_acknowledged', label: 'Acknowledged', icon: '👮' },
  { key: 'work_started', label: 'Work Started', icon: '🔧' },
  { key: 'resolved', label: 'Resolved', icon: '✅' },
  { key: 'citizen_verified', label: 'Verified', icon: '🎉' },
];

export default function TrackComplaint() {
  const [searchParams] = useSearchParams();
  const [searchId, setSearchId] = useState(searchParams.get('id') || '');
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (searchParams.get('id')) {
      handleSearch(searchParams.get('id'));
    }
  }, [searchParams]);

  async function handleSearch(id) {
    const cid = id || searchId;
    if (!cid.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data = await trackComplaint(cid.trim());
      setComplaint(data);
    } catch (err) {
      setError('Complaint not found. Check the ID and try again.');
      setComplaint(null);
    }
    setLoading(false);
  }

  async function handleVerify(verification) {
    if (!complaint) return;
    setVerifying(true);
    try {
      await verifyComplaint(complaint.complaint.id, verification, '');
      await handleSearch(complaint.complaint.complaint_id);
    } catch (err) {
      console.error(err);
    }
    setVerifying(false);
  }

  const c = complaint?.complaint;
  const currentStepIndex = c ? STATUS_STEPS.findIndex(s => s.key === c.status) : -1;

  return (
    <div className="page-container" style={{ padding: 16 }}>
      <div className="page-header" style={{ paddingTop: 8 }}>
        <h1 className="page-header__title">Track Issue</h1>
        <p className="page-header__subtitle">Enter your complaint ID to see real-time status</p>
      </div>

      {/* Search Bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <input
          className="input-field"
          placeholder="CIV-2026-XXXXXX"
          value={searchId}
          onChange={e => setSearchId(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          style={{ flex: 1 }}
        />
        <button className="btn btn-primary" onClick={() => handleSearch()} disabled={loading}>
          <Search size={18} />
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div className="skeleton" style={{ width: '100%', height: 200 }} />
        </div>
      )}

      {error && (
        <div style={{
          textAlign: 'center', padding: 40,
          color: 'var(--accent-red)', fontSize: '0.9rem'
        }}>
          {error}
        </div>
      )}

      {/* Complaint Detail */}
      {c && (
        <div className="animate-in">
          {/* Header Card */}
          <div className="card" style={{ padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--accent-blue)', fontWeight: 700, marginBottom: 4 }}>
                  {c.complaint_id}
                </div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{c.title}</h2>
              </div>
              <StatusBadge status={c.status} />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              <PriorityBadge priority={c.severity || c.priority} />
              {complaint.location && (
                <span className="text-xs text-muted" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={12} /> {complaint.location.address || complaint.location.ward}
                </span>
              )}
            </div>

            {c.description && (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 8 }}>
                {c.description}
              </p>
            )}
          </div>

          {/* SLA Timer */}
          {complaint.sla && (
            <div style={{ marginBottom: 16 }}>
              <SlaTimer deadline={complaint.sla.deadline} isBreached={complaint.sla.is_breached} />
            </div>
          )}

          {/* Timeline */}
          <div className="card" style={{ padding: 16, marginBottom: 16 }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 16 }}>
              📋 Complaint Timeline
            </h3>
            <div className="timeline">
              {STATUS_STEPS.map((step, i) => {
                const isDone = i <= currentStepIndex;
                const isActive = i === currentStepIndex;
                const historyEntry = complaint.history?.find(h => h.to_status === step.key);

                return (
                  <div className="timeline-step" key={step.key}>
                    <div className={`timeline-dot ${isDone ? 'timeline-dot--done' : ''} ${isActive ? 'timeline-dot--active' : ''}`}>
                      {isDone ? '✓' : (i + 1)}
                    </div>
                    <div className={`timeline-step__title ${!isDone ? 'timeline-step__title--muted' : ''}`}>
                      {step.icon} {step.label}
                    </div>
                    {historyEntry && (
                      <div className="timeline-step__time">
                        {new Date(historyEntry.changed_at).toLocaleString()}
                      </div>
                    )}
                    {isActive && (
                      <div className="timeline-step__desc">← Current Status</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Analysis */}
          {(c.ai_category || c.ai_confidence) && (
            <div style={{ marginBottom: 16 }}>
              <AiResultCard result={{
                category: c.ai_category,
                categoryLabel: c.ai_category?.replace(/_/g, ' '),
                confidence: c.ai_confidence,
                severity: c.severity,
                severityScore: c.severity_score,
                description: c.ai_description,
                possibleRisk: c.ai_possible_risk
              }} />
            </div>
          )}

          {/* Department Routing */}
          {complaint.department && (
            <div className="card" style={{ padding: 16, marginBottom: 16 }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Building2 size={16} /> Routed To
              </h3>
              <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 4 }}>
                {complaint.department.name}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {complaint.department.description}
              </div>
            </div>
          )}

          {/* Before/After Evidence */}
          {complaint.evidence && (
            <div className="card" style={{ padding: 16, marginBottom: 16 }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 12 }}>
                📸 Resolution Evidence
              </h3>
              <div className="evidence-grid">
                {complaint.evidence.before_image_url && (
                  <div className="evidence-card">
                    <span className="evidence-card__label evidence-card__label--before">BEFORE</span>
                    <img
                      src={complaint.evidence.before_image_url.startsWith('http')
                        ? complaint.evidence.before_image_url
                        : `${API_BASE}${complaint.evidence.before_image_url}`}
                      alt="Before"
                    />
                  </div>
                )}
                {complaint.evidence.after_image_url && (
                  <div className="evidence-card">
                    <span className="evidence-card__label evidence-card__label--after">AFTER</span>
                    <img
                      src={complaint.evidence.after_image_url.startsWith('http')
                        ? complaint.evidence.after_image_url
                        : `${API_BASE}${complaint.evidence.after_image_url}`}
                      alt="After"
                    />
                  </div>
                )}
              </div>
              {complaint.evidence.resolution_notes && (
                <div style={{ marginTop: 12, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <strong>Notes:</strong> {complaint.evidence.resolution_notes}
                </div>
              )}
            </div>
          )}

          {/* Citizen Verification */}
          {(c.status === 'resolved' && c.citizen_verification !== 'yes') && (
            <div className="card" style={{ padding: 16, marginBottom: 16 }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 12 }}>
                🗳️ Is this issue actually resolved?
              </h3>
              <div className="verify-group" style={{ padding: 0 }}>
                <button
                  className="verify-btn verify-btn--yes"
                  onClick={() => handleVerify('yes')}
                  disabled={verifying}
                >
                  ✅ Yes
                </button>
                <button
                  className="verify-btn"
                  onClick={() => handleVerify('partially')}
                  disabled={verifying}
                >
                  ⚠️ Partially
                </button>
                <button
                  className="verify-btn verify-btn--no"
                  onClick={() => handleVerify('no')}
                  disabled={verifying}
                >
                  ❌ No
                </button>
              </div>
            </div>
          )}

          {/* Upvote */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <button
              className="btn btn-secondary"
              onClick={() => upvoteComplaint(c.id)}
            >
              <ThumbsUp size={16} /> Support this issue ({c.upvote_count || 0})
            </button>
          </div>
        </div>
      )}

      {/* Default state */}
      {!complaint && !loading && !error && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '3rem', marginBottom: 12 }}>🔍</p>
          <p>Enter a complaint ID above to track its status</p>
        </div>
      )}
    </div>
  );
}
