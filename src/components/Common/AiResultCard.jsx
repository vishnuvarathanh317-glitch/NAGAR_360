import React from 'react';
import { Sparkles } from 'lucide-react';

export default function AiResultCard({ result }) {
  if (!result) return null;

  const confidence = Math.round((result.confidence || 0) * 100);
  const severityScore = result.severityScore || result.severity_score || 50;

  return (
    <div className="ai-result animate-in">
      <div className="ai-result__header">
        <Sparkles size={18} color="#a855f7" />
        <span>Gemini AI Analysis</span>
        {result.isMock && <span className="badge badge--medium" style={{ marginLeft: 8 }}>Demo</span>}
      </div>

      <div className="ai-result__grid">
        <div className="ai-result__item">
          <div className="ai-result__label">Category</div>
          <div className="ai-result__value">
            {result.categoryLabel || result.category}
          </div>
        </div>

        <div className="ai-result__item">
          <div className="ai-result__label">Confidence</div>
          <div className="ai-result__value" style={{
            color: confidence > 85 ? '#00c853' : confidence > 60 ? '#ffab00' : '#ed4956'
          }}>
            {confidence}%
          </div>
        </div>

        <div className="ai-result__item">
          <div className="ai-result__label">Severity</div>
          <div className="ai-result__value" style={{
            color: getSeverityColor(result.severity)
          }}>
            {(result.severity || 'medium').toUpperCase()}
          </div>
        </div>

        <div className="ai-result__item">
          <div className="ai-result__label">Score</div>
          <div className="ai-result__value">{severityScore}/100</div>
        </div>
      </div>

      {result.description && (
        <div style={{ marginTop: 12, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>Description:</strong> {result.description}
        </div>
      )}

      {result.possibleRisk && (
        <div style={{ marginTop: 6, fontSize: '0.85rem', color: '#ed4956' }}>
          <strong>⚠️ Risk:</strong> {result.possibleRisk}
        </div>
      )}

      {/* AI Verification Report */}
      {result.isReal !== undefined && (
        <div className="authenticity-card" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              AI Authenticity Check
            </span>
            <span className={`authenticity-badge ${result.isReal ? 'authenticity-badge--real' : 'authenticity-badge--fake'}`}>
              {result.isReal ? '✓ Verified Real' : '⚠ Flagged Suspicious'}
            </span>
          </div>

          {result.validityReason && (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: '8px 0' }}>
              <strong>AI Review:</strong> {result.validityReason}
            </p>
          )}

          {result.imageDetails && (
            <div className="authenticity-details-grid" style={{ marginTop: 10 }}>
              <div className="authenticity-detail-item" style={{ gridColumn: 'span 2' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase' }}>Detected Elements</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                  {result.imageDetails.detectedObjects && result.imageDetails.detectedObjects.length > 0
                    ? result.imageDetails.detectedObjects.join(', ')
                    : 'None'}
                </div>
              </div>

              <div className="authenticity-detail-item" style={{
                borderLeft: `2px solid ${result.imageDetails.isStockImage ? 'var(--accent-red)' : 'var(--accent-green)'}`
              }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase' }}>Stock Image Flag</div>
                <div style={{ fontWeight: 600, color: result.imageDetails.isStockImage ? 'var(--accent-red)' : 'var(--text-primary)', marginTop: 2 }}>
                  {result.imageDetails.isStockImage ? '⚠ Stock Photo' : 'No (Original Capture)'}
                </div>
              </div>

              <div className="authenticity-detail-item" style={{
                borderLeft: `2px solid ${result.imageDetails.isEdited ? 'var(--accent-red)' : 'var(--accent-green)'}`
              }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase' }}>Manipulation Check</div>
                <div style={{ fontWeight: 600, color: result.imageDetails.isEdited ? 'var(--accent-red)' : 'var(--text-primary)', marginTop: 2 }}>
                  {result.imageDetails.isEdited ? '⚠ Edited/Tampered' : 'No (Untampered)'}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getSeverityColor(s) {
  return { critical: '#ed4956', high: '#ff6d00', medium: '#ffab00', low: '#0095f6' }[s] || '#ffab00';
}
