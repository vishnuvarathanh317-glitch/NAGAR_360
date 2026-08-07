const { get, all, run, saveDb } = require('../config/database');

const SLA_RULES = {
  critical: { hours: 24, label: '24 hours' },
  high: { hours: 48, label: '48 hours' },
  medium: { hours: 168, label: '7 days' },
  low: { hours: 360, label: '15 days' },
};

function createSlaRecord(complaintId, severity) {
  const rule = SLA_RULES[severity] || SLA_RULES.medium;
  const deadline = new Date(Date.now() + rule.hours * 3600 * 1000).toISOString();

  run(
    `INSERT OR REPLACE INTO sla_records (complaint_id, priority, deadline, is_breached)
     VALUES (?, ?, ?, 0)`,
    [complaintId, severity, deadline]
  );
}

function getSlaStatus(complaintId) {
  const sla = get('SELECT * FROM sla_records WHERE complaint_id = ?', [complaintId]);
  if (!sla) return null;

  const now = new Date();
  const deadline = new Date(sla.deadline);
  const diff = deadline - now;
  const isOverdue = diff <= 0 || sla.is_breached;

  let remaining;
  if (isOverdue) {
    const abs = Math.abs(diff);
    const hours = Math.floor(abs / 3600000);
    remaining = `OVERDUE by ${hours}h`;
  } else {
    const hours = Math.floor(diff / 3600000);
    if (hours >= 24) {
      remaining = `${Math.floor(hours / 24)}d ${hours % 24}h remaining`;
    } else {
      remaining = `${hours}h remaining`;
    }
  }

  return { ...sla, isOverdue, remaining };
}

function checkAndEscalateBreaches() {
  const breached = all(`
    SELECT s.*, c.complaint_id as cid, c.status, c.department_id
    FROM sla_records s
    JOIN complaints c ON s.complaint_id = c.id
    WHERE s.is_breached = 0
    AND s.deadline < datetime('now')
    AND c.status NOT IN ('resolved', 'citizen_verified', 'closed')
  `);

  let count = 0;
  for (const b of breached) {
    run(
      `UPDATE sla_records SET is_breached = 1, breached_at = datetime('now'), escalation_level = escalation_level + 1
       WHERE complaint_id = ?`,
      [b.complaint_id]
    );

    run(
      `INSERT INTO escalations (complaint_id, sla_record_id, escalation_level, escalated_to, reason)
       VALUES (?, ?, ?, 'department_head', 'SLA deadline breached')`,
      [b.complaint_id, b.id, (b.escalation_level || 0) + 1]
    );

    run(
      `INSERT INTO notifications (user_id, complaint_id, type, message)
       VALUES (?, ?, 'sla_breach', ?)`,
      [b.assigned_officer_id || 2, b.complaint_id, `SLA BREACHED for complaint ${b.cid}`]
    );

    count++;
  }

  if (count > 0) {
    saveDb();
    console.log(`⚠️ ${count} SLA breach(es) escalated`);
  }

  return count;
}

module.exports = { createSlaRecord, getSlaStatus, checkAndEscalateBreaches, SLA_RULES };
