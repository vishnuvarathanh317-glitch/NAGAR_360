import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  fetchOfficerQueue,
  updateOfficerStatus,
  resolveComplaintWithProof,
  fetchNotifications,
  markNotificationRead,
  sendOfficerVoiceCommand
} from '../services/api';
import StatusBadge from '../components/Common/StatusBadge';
import PriorityBadge from '../components/Common/PriorityBadge';
import SlaTimer from '../components/Common/SlaTimer';
import StatCard from '../components/Common/StatCard';
import AiResultCard from '../components/Common/AiResultCard';
import { Upload, CheckCircle, Play, Eye, Bell, Mic, MicOff, Sparkles } from 'lucide-react';

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

  // Voice Assistant & Notifications States
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [voiceSpeech, setVoiceSpeech] = useState(null);
  const [speechBubbleRole, setSpeechBubbleRole] = useState('assistant');
  const [isRecording, setIsRecording] = useState(false);
  const [highlightedId, setHighlightedId] = useState(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (!isOfficer) {
      navigate('/login');
      return;
    }
    loadQueue();
    loadNotifications();
    initSpeechRecognition();
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

  async function loadNotifications() {
    try {
      const data = await fetchNotifications();
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }

  async function handleMarkNotificationRead(id) {
    try {
      await markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch (err) {
      console.error(err);
    }
  }

  function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsRecording(true);
      setVoiceSpeech('Listening... speak a command.');
      setSpeechBubbleRole('assistant');
    };

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      setVoiceSpeech(`You said: "${transcript}"`);
      setSpeechBubbleRole('user');
      
      try {
        const data = await sendOfficerVoiceCommand(transcript, counts);
        const res = data.result;

        setTimeout(() => {
          setVoiceSpeech(res.speech);
          setSpeechBubbleRole('assistant');
          speakAloud(res.speech);
          executeVoiceAction(res);
        }, 800);
      } catch (err) {
        setVoiceSpeech('Error processing voice command.');
        setSpeechBubbleRole('assistant');
      }
    };

    recognition.onerror = () => {
      setIsRecording(false);
      setVoiceSpeech('Could not understand. Please try again.');
      setSpeechBubbleRole('assistant');
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
  }

  function speakAloud(text) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }

  async function executeVoiceAction(res) {
    if (res.action === 'highlight_complaint' && res.complaintId) {
      const found = queue.find(c => c.complaint_id === res.complaintId || String(c.id) === String(res.complaintId));
      if (found) {
        setSelected(found.id);
        setHighlightedId(found.id);
        setTimeout(() => {
          const element = document.getElementById(`complaint-card-${found.id}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 150);
        setTimeout(() => setHighlightedId(null), 4000);
      }
    } else if (res.action === 'update_status') {
      await loadQueue();
      const found = queue.find(c => c.complaint_id === res.complaintId || String(c.id) === String(res.complaintId));
      if (found) {
        setSelected(found.id);
        setHighlightedId(found.id);
        setTimeout(() => setHighlightedId(null), 4000);
      }
    } else if (res.action === 'read_notifications') {
      setShowNotifications(true);
    }
  }

  function toggleRecording() {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.start();
      } else {
        alert('Speech recognition is not supported in this browser. Please use Google Chrome or Safari.');
      }
    }
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
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-header__title">👮 Officer Dashboard</h1>
          <p className="page-header__subtitle">
            Welcome, {user?.name || 'Officer'}
          </p>
        </div>
        <div style={{ position: 'relative' }}>
          <button
            className="top-bar__icon-btn"
            style={{ padding: 10, background: 'var(--bg-surface)', borderRadius: '50%', border: '1px solid var(--border-subtle)' }}
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell size={20} />
            {notifications.filter(n => !n.is_read).length > 0 && (
              <span className="notification-dot" style={{ top: 4, right: 4 }} />
            )}
          </button>

          {showNotifications && (
            <div className="notification-dropdown">
              <div className="notification-dropdown__header">
                <span>Alerts & Notifications</span>
                <button
                  className="btn btn-secondary btn--sm"
                  style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                  onClick={async () => {
                    const unread = notifications.filter(n => !n.is_read);
                    for (const n of unread) {
                      await markNotificationRead(n.id);
                    }
                    setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
                  }}
                >
                  Mark all read
                </button>
              </div>
              <div className="notification-dropdown__list">
                {notifications.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    No notifications
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      className={`notification-dropdown__item ${!n.is_read ? 'notification-dropdown__item--unread' : ''}`}
                      onClick={() => handleMarkNotificationRead(n.id)}
                    >
                      <div style={{ fontWeight: 600 }}>{n.message}</div>
                      <div className="notification-dropdown__time">
                        {new Date(n.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
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
                id={`complaint-card-${c.id}`}
                className={`queue-card animate-in ${isOverdue ? 'queue-card--overdue' : ''}`}
                style={{
                  animationDelay: `${i * 0.05}s`,
                  border: highlightedId === c.id ? '2px solid var(--accent-amber)' : undefined
                }}
                onClick={() => setSelected(isSelected ? null : c.id)}
              >
                <div className="queue-card__top">
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div className="queue-card__id">{c.complaint_id}</div>
                    {c.ai_is_real === 0 && (
                      <span className="badge badge--critical" style={{ fontSize: '0.62rem', padding: '1px 6px' }}>
                        ⚠ SUSPICIOUS
                      </span>
                    )}
                    {c.ai_is_real === 1 && (
                      <span className="badge badge--resolved" style={{ fontSize: '0.62rem', padding: '1px 6px' }}>
                        ✓ AI REAL
                      </span>
                    )}
                  </div>
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
                    {/* AI Verification Report */}
                    {(c.ai_category || c.ai_confidence) && (
                      <div style={{ marginBottom: 8 }} onClick={e => e.stopPropagation()}>
                        <AiResultCard result={{
                          category: c.ai_category,
                          categoryLabel: c.ai_category?.replace(/_/g, ' '),
                          confidence: c.ai_confidence,
                          severity: c.severity,
                          severityScore: c.severity_score,
                          description: c.ai_description,
                          possibleRisk: c.ai_possible_risk,
                          isReal: c.ai_is_real,
                          validityReason: c.ai_validation_reason,
                          imageDetails: c.ai_image_details ? JSON.parse(c.ai_image_details) : null
                        }} />
                      </div>
                    )}

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

      {/* Floating Voice Assistant */}
      <button
        className={`voice-assistant-fab ${isRecording ? 'voice-assistant-fab--recording' : ''}`}
        onClick={toggleRecording}
        title="AI Voice Assistant"
      >
        {isRecording ? (
          <div className="sound-waves">
            <div className="sound-wave-bar" />
            <div className="sound-wave-bar" />
            <div className="sound-wave-bar" />
            <div className="sound-wave-bar" />
            <div className="sound-wave-bar" />
          </div>
        ) : (
          <Mic size={24} />
        )}
      </button>

      {/* Voice Assistant Speech Bubble */}
      {voiceSpeech && (
        <div className={`voice-speech-bubble voice-speech-bubble--${speechBubbleRole}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              {speechBubbleRole === 'assistant' ? 'AI Voice Assistant' : 'You Spoke'}
            </span>
            <button
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}
              onClick={() => setVoiceSpeech(null)}
            >
              ✕
            </button>
          </div>
          <div>{voiceSpeech}</div>
        </div>
      )}
    </div>
  );
}
