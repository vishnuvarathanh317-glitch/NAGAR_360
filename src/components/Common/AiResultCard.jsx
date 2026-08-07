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
    </div>
  );
}

function getSeverityColor(s) {
  return { critical: '#ed4956', high: '#ff6d00', medium: '#ffab00', low: '#0095f6' }[s] || '#ffab00';
}
