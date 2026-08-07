import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Upload, MapPin, Send, Loader, AlertTriangle } from 'lucide-react';
import { submitComplaint } from '../services/api';
import AiResultCard from '../components/Common/AiResultCard';

export default function ReportIssue() {
  const [step, setStep] = useState(1); // 1=capture, 2=review+submit
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [gps, setGps] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsAddress, setGpsAddress] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');

  const fileRef = useRef();
  const navigate = useNavigate();

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
    detectGps();
    setStep(2);
  }

  function detectGps() {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setGps(coords);
        // Reverse geocode
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}`
          );
          const data = await res.json();
          setGpsAddress(data.display_name || `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
        } catch {
          setGpsAddress(`${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
        }
        setGpsLoading(false);
      },
      () => {
        setGpsAddress('Chennai, Tamil Nadu (default)');
        setGps({ lat: 13.0827, lng: 80.2707 });
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleSubmit() {
    if (!image) return setError('Please capture or upload a photo.');
    setSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('image', image);
      formData.append('title', title || 'Civic Issue Report');
      formData.append('description', description || '');
      if (gps) {
        formData.append('latitude', gps.lat);
        formData.append('longitude', gps.lng);
      }

      const result = await submitComplaint(formData);

      if (result.aiAnalysis) setAiResult(result.aiAnalysis);

      setSuccess({
        complaintId: result.complaintId || result.complaint_id,
        message: result.message
      });
    } catch (err) {
      setError(err.message || 'Submission failed. Please try again.');
    }
    setSubmitting(false);
  }

  // SUCCESS STATE
  if (success) {
    return (
      <div className="page-container" style={{ padding: 16 }}>
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          animation: 'fadeInUp 0.5s both'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: 16 }}>✅</div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 8 }}>
            Issue Reported!
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>
            Your complaint has been submitted and routed.
          </p>
          <div style={{
            background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)',
            padding: 20, marginBottom: 24, border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>
              COMPLAINT ID
            </div>
            <div style={{
              fontSize: '1.3rem', fontWeight: 800,
              color: 'var(--accent-blue)', letterSpacing: '0.02em'
            }}>
              {success.complaintId}
            </div>
          </div>

          {aiResult && <AiResultCard result={aiResult} />}

          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button
              className="btn btn-primary btn--full"
              onClick={() => navigate(`/track?id=${success.complaintId}`)}
            >
              Track Complaint
            </button>
            <button
              className="btn btn-secondary btn--full"
              onClick={() => navigate('/')}
            >
              Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ padding: 16 }}>
      {/* Step 1: Capture */}
      {step === 1 && (
        <div className="animate-in">
          <div className="page-header" style={{ paddingTop: 8 }}>
            <h1 className="page-header__title">Report Issue</h1>
            <p className="page-header__subtitle">
              Take a photo of the civic problem. AI will handle the rest.
            </p>
          </div>

          <div
            className="capture-zone"
            onClick={() => fileRef.current?.click()}
          >
            <Camera size={48} color="var(--text-muted)" style={{ marginBottom: 16 }} />
            <p style={{ fontWeight: 600, marginBottom: 4 }}>Tap to capture or upload</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              JPEG, PNG or WebP · Max 10MB
            </p>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageChange}
            style={{ display: 'none' }}
          />

          <div style={{
            marginTop: 24, padding: 20, background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)'
          }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 12 }}>
              How it works
            </h3>
            {[
              { icon: '📷', text: 'Capture a photo of the issue' },
              { icon: '🤖', text: 'AI identifies category & severity' },
              { icon: '📍', text: 'GPS pins the exact location' },
              { icon: '🏢', text: 'Auto-routed to the right department' },
              { icon: '⏱️', text: 'SLA countdown starts immediately' },
            ].map((s, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '8px 0', fontSize: '0.85rem'
              }}>
                <span style={{ fontSize: '1.2rem' }}>{s.icon}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{s.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Review & Submit */}
      {step === 2 && (
        <div className="animate-in">
          {/* Image Preview */}
          <div className="capture-zone capture-zone--has-image" style={{ marginBottom: 16 }}>
            <img
              src={preview}
              alt="Issue preview"
              style={{ width: '100%', maxHeight: 350, objectFit: 'cover' }}
            />
          </div>

          <button
            className="btn btn-secondary btn--full btn--sm"
            style={{ marginBottom: 16 }}
            onClick={() => { setStep(1); setImage(null); setPreview(null); }}
          >
            ← Retake Photo
          </button>

          {/* GPS */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: 12, background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)', marginBottom: 16,
            border: '1px solid var(--border-subtle)', fontSize: '0.85rem'
          }}>
            <MapPin size={18} color="var(--accent-blue)" />
            {gpsLoading ? (
              <span style={{ color: 'var(--text-muted)' }}>
                <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Detecting location...
              </span>
            ) : (
              <span style={{ color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {gpsAddress || 'Location unavailable'}
              </span>
            )}
          </div>

          {/* Title & Description */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
            <input
              type="text"
              className="input-field"
              placeholder="Issue title (AI will auto-fill if blank)"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
            <textarea
              className="input-field"
              placeholder="Add details (optional)..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: 12, background: 'rgba(237,73,86,0.1)',
              borderRadius: 'var(--radius-md)', marginBottom: 16,
              color: 'var(--accent-red)', fontSize: '0.85rem'
            }}>
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          {/* Submit */}
          <button
            className="btn btn-gradient btn--full btn--lg"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
                AI Analyzing & Routing...
              </>
            ) : (
              <>
                <Send size={18} />
                Submit & Route
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
