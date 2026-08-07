import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export default function SlaTimer({ deadline, isBreached }) {
  const [remaining, setRemaining] = useState('');
  const [overdue, setOverdue] = useState(isBreached || false);

  useEffect(() => {
    if (!deadline) return;

    const update = () => {
      const now = new Date();
      const dl = new Date(deadline);
      const diff = dl - now;

      if (diff <= 0) {
        setOverdue(true);
        const absDiff = Math.abs(diff);
        const hours = Math.floor(absDiff / 3600000);
        const mins = Math.floor((absDiff % 3600000) / 60000);
        setRemaining(`OVERDUE by ${hours}h ${mins}m`);
      } else {
        setOverdue(false);
        const hours = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        if (hours >= 24) {
          const days = Math.floor(hours / 24);
          setRemaining(`${days}d ${hours % 24}h remaining`);
        } else {
          setRemaining(`${hours}h ${mins}m remaining`);
        }
      }
    };

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [deadline, isBreached]);

  if (!deadline) return null;

  return (
    <div className={`sla-banner ${overdue ? 'sla-banner--overdue' : 'sla-banner--active'}`}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Clock size={16} />
        SLA: {remaining}
      </span>
      <span style={{ fontSize: '0.75rem' }}>
        {new Date(deadline).toLocaleDateString()}
      </span>
    </div>
  );
}
