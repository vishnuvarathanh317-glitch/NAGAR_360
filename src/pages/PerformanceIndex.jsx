import React, { useState, useEffect } from 'react';
import { fetchPerformanceRankings } from '../services/api';

const MEDALS = ['🥇', '🥈', '🥉'];

const FORMULA = [
  { label: 'SLA Compliance', weight: 25, color: '#0095f6' },
  { label: 'Resolution Rate', weight: 20, color: '#00c853' },
  { label: 'Avg Speed', weight: 20, color: '#00bcd4' },
  { label: 'Citizen Satisfaction', weight: 15, color: '#a855f7' },
  { label: 'Non-Recurrence', weight: 10, color: '#ffab00' },
  { label: 'Response Rate', weight: 10, color: '#ff6d00' },
];

export default function PerformanceIndex() {
  const [rankings, setRankings] = useState([]);
  const [type, setType] = useState('department');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRankings();
  }, [type]);

  async function loadRankings() {
    setLoading(true);
    try {
      const data = await fetchPerformanceRankings(type);
      setRankings(data.rankings || []);
    } catch (err) {
      console.error('Performance error:', err);
    }
    setLoading(false);
  }

  return (
    <div className="page-container page-container--wide">
      <div className="page-header">
        <h1 className="page-header__title">🏆 Civic Performance Index</h1>
        <p className="page-header__subtitle">
          Weighted scoring that measures actual civic accountability
        </p>
      </div>

      {/* Formula Breakdown */}
      <div style={{ padding: '0 16px 20px' }}>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 16 }}>
            📐 CPI Formula
          </h3>
          <div style={{ display: 'flex', gap: 2, height: 28, borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
            {FORMULA.map((f, i) => (
              <div
                key={i}
                style={{
                  flex: f.weight, background: f.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.6rem', fontWeight: 700, color: '#fff',
                  whiteSpace: 'nowrap'
                }}
                title={`${f.label} (${f.weight}%)`}
              >
                {f.weight}%
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {FORMULA.map((f, i) => (
              <span key={i} style={{
                fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 4,
                color: 'var(--text-secondary)'
              }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: f.color }} />
                {f.label} ({f.weight}%)
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Toggle */}
      <div style={{ padding: '0 16px 16px', display: 'flex', gap: 8 }}>
        {['department', 'city'].map(t => (
          <button
            key={t}
            className={`btn ${type === t ? 'btn-primary' : 'btn-secondary'} btn--sm`}
            onClick={() => setType(t)}
          >
            {t === 'department' ? '🏢 Departments' : '🌆 Cities'}
          </button>
        ))}
      </div>

      {/* Rankings */}
      <div style={{ padding: '0 16px 24px' }}>
        {loading ? (
          <div>
            {[1,2,3,4,5].map(i => (
              <div key={i} className="skeleton" style={{ height: 70, marginBottom: 8, borderRadius: 12 }} />
            ))}
          </div>
        ) : rankings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            No performance data available yet.
          </div>
        ) : (
          rankings.map((r, i) => (
            <div
              key={i}
              className="card animate-in"
              style={{
                padding: 16, marginBottom: 10,
                display: 'flex', alignItems: 'center', gap: 14,
                animationDelay: `${i * 0.06}s`,
                borderLeft: i < 3 ? `4px solid ${['#FFD700','#C0C0C0','#CD7F32'][i]}` : 'none'
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'var(--bg-elevated)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: i < 3 ? '1.3rem' : '0.9rem',
                color: i < 3 ? '#FFD700' : 'var(--text-muted)',
                flexShrink: 0
              }}>
                {i < 3 ? MEDALS[i] : `#${i + 1}`}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                  {r.entity_name || r.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  SLA: {r.sla_compliance || 0}% · Resolution: {r.resolution_rate || 0}% · Speed: {r.avg_speed_score || 0}%
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: '1.4rem', fontWeight: 900,
                  color: getScoreColor(r.overall_score || r.score)
                }}>
                  {Math.round(r.overall_score || r.score || 0)}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>/ 100</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function getScoreColor(score) {
  if (score >= 80) return '#00c853';
  if (score >= 60) return '#ffab00';
  if (score >= 40) return '#ff6d00';
  return '#ed4956';
}
