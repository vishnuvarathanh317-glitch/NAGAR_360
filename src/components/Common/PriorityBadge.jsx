import React from 'react';

const PRIORITY_MAP = {
  critical: { label: '🔴 Critical', cls: 'badge--critical' },
  high: { label: '🟠 High', cls: 'badge--high' },
  medium: { label: '🟡 Medium', cls: 'badge--medium' },
  low: { label: '🔵 Low', cls: 'badge--low' },
};

export default function PriorityBadge({ priority }) {
  const config = PRIORITY_MAP[priority] || PRIORITY_MAP.medium;
  return <span className={`badge ${config.cls}`}>{config.label}</span>;
}
