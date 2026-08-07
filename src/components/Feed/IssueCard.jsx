import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ThumbsUp, MessageCircle, Share2, Clock, Bookmark } from 'lucide-react';
import PriorityBadge from '../Common/PriorityBadge';

const API_BASE = 'http://localhost:5000';

const DEPT_ICONS = {
  ROAD: '🛣️', WASTE: '🗑️', ELECTRICAL: '💡', WATER: '💧', PARKS: '🌳'
};

export default function IssueCard({ issue, onUpvote }) {
  const [liked, setLiked] = useState(false);
  const [localUpvotes, setLocalUpvotes] = useState(issue.upvote_count || 1);

  const handleLike = () => {
    if (!liked) {
      setLiked(true);
      setLocalUpvotes(prev => prev + 1);
      if (onUpvote) onUpvote(issue.id);
    }
  };

  const imageUrl = issue.before_image || issue.image_url;
  const displayImage = imageUrl?.startsWith('http')
    ? imageUrl
    : imageUrl ? `${API_BASE}${imageUrl}` : null;

  const timeAgo = getTimeAgo(issue.created_at);

  return (
    <article className="issue-card animate-in">
      {/* Header — Department + Location */}
      <div className="issue-card__header">
        <div className="issue-card__dept-info">
          <div className="issue-card__dept-avatar">
            {DEPT_ICONS[issue.department_code] || '🏛️'}
          </div>
          <div>
            <div className="issue-card__dept-name">
              {issue.department_name || 'Civic Department'}
            </div>
            <div className="issue-card__location">
              📍 {issue.ward || issue.address || issue.city || 'Location'}
            </div>
          </div>
        </div>
        <PriorityBadge priority={issue.severity || issue.priority} />
      </div>

      {/* Image */}
      <div className="issue-card__image-wrapper" onDoubleClick={handleLike}>
        {displayImage ? (
          <img
            src={displayImage}
            alt={issue.title}
            className="issue-card__image"
            loading="lazy"
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: 'var(--bg-elevated)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-muted)', fontSize: '3rem'
          }}>
            📷
          </div>
        )}

        {/* Severity Tag */}
        <span
          className="issue-card__severity-tag"
          style={{
            background: getSeverityBg(issue.severity),
            color: '#fff'
          }}
        >
          {(issue.severity || 'medium').toUpperCase()}
        </span>

        {/* SLA Overlay */}
        {issue.sla_remaining && (
          <div className="issue-card__sla-overlay">
            <span style={{ color: '#fff', fontSize: '0.78rem', fontWeight: 600 }}>
              <Clock size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              {issue.sla_remaining}
            </span>
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="issue-card__actions">
        <div className="issue-card__action-group">
          <button
            className={`issue-card__action-btn ${liked ? 'issue-card__action-btn--liked heart-pop' : ''}`}
            onClick={handleLike}
          >
            <ThumbsUp size={22} fill={liked ? 'currentColor' : 'none'} />
          </button>
          <Link to={`/track?id=${issue.complaint_id}`} className="issue-card__action-btn">
            <MessageCircle size={22} />
          </Link>
          <button className="issue-card__action-btn" onClick={() => {
            navigator.clipboard?.writeText(`${window.location.origin}/track?id=${issue.complaint_id}`);
          }}>
            <Share2 size={22} />
          </button>
        </div>
        <button className="issue-card__action-btn">
          <Bookmark size={22} />
        </button>
      </div>

      {/* Details */}
      <div className="issue-card__details">
        <div className="issue-card__supporters">{localUpvotes} supporters</div>
        <div className="issue-card__ai-summary">
          <strong>{issue.title}</strong>
        </div>
        {issue.ai_description && (
          <div className="issue-card__ai-summary">
            🤖 {issue.ai_description}
          </div>
        )}
        {issue.ai_confidence && (
          <div className="issue-card__ai-summary">
            AI Confidence: {Math.round(issue.ai_confidence * 100)}%
          </div>
        )}
        <div className="issue-card__meta">
          {issue.complaint_id} · {timeAgo}
        </div>
      </div>
    </article>
  );
}

function getSeverityBg(severity) {
  const map = {
    critical: 'rgba(237, 73, 86, 0.85)',
    high: 'rgba(255, 109, 0, 0.85)',
    medium: 'rgba(255, 171, 0, 0.85)',
    low: 'rgba(0, 149, 246, 0.85)'
  };
  return map[severity] || map.medium;
}

function getTimeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
