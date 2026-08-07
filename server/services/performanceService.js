const { get, all, run, saveDb } = require('../config/database');

function calculatePerformanceScores() {
  const departments = all('SELECT * FROM departments');

  for (const dept of departments) {
    const total = get('SELECT COUNT(*) as c FROM complaints WHERE department_id = ?', [dept.id])?.c || 0;
    if (total === 0) continue;

    const resolved = get(
      `SELECT COUNT(*) as c FROM complaints WHERE department_id = ? AND status IN ('resolved','citizen_verified')`,
      [dept.id]
    )?.c || 0;

    const slaCompliant = get(
      `SELECT COUNT(*) as c FROM sla_records s
       JOIN complaints c ON s.complaint_id = c.id
       WHERE c.department_id = ? AND s.is_breached = 0`,
      [dept.id]
    )?.c || 0;

    const avgDays = get(
      `SELECT AVG(julianday(resolved_at) - julianday(created_at)) as d
       FROM complaints WHERE department_id = ? AND resolved_at IS NOT NULL`,
      [dept.id]
    )?.d;

    const verified = get(
      `SELECT COUNT(*) as c FROM complaints
       WHERE department_id = ? AND citizen_verification = 'yes'`,
      [dept.id]
    )?.c || 0;

    const acknowledged = get(
      `SELECT COUNT(*) as c FROM complaints
       WHERE department_id = ? AND status NOT IN ('submitted','ai_verified')`,
      [dept.id]
    )?.c || 0;

    // Weighted CPI Formula
    const slaScore = total > 0 ? (slaCompliant / total) * 100 : 0;
    const resRate = total > 0 ? (resolved / total) * 100 : 0;
    const speedScore = avgDays ? Math.max(0, 100 - (avgDays * 10)) : 50;
    const satisfactionScore = resolved > 0 ? (verified / resolved) * 100 : 0;
    const recurrenceScore = 80; // Simplified
    const responseScore = total > 0 ? (acknowledged / total) * 100 : 0;

    const overall =
      slaScore * 0.25 +
      resRate * 0.20 +
      speedScore * 0.20 +
      satisfactionScore * 0.15 +
      recurrenceScore * 0.10 +
      responseScore * 0.10;

    // Upsert
    const existing = get(
      `SELECT id FROM performance_scores WHERE entity_type = 'department' AND entity_name = ?`,
      [dept.name]
    );

    if (existing) {
      run(
        `UPDATE performance_scores SET overall_score = ?, sla_compliance = ?, resolution_rate = ?,
         avg_speed_score = ?, citizen_satisfaction = ?, non_recurrence = ?, response_rate = ?,
         calculated_at = datetime('now') WHERE id = ?`,
        [overall, slaScore, resRate, speedScore, satisfactionScore, recurrenceScore, responseScore, existing.id]
      );
    } else {
      run(
        `INSERT INTO performance_scores (entity_type, entity_name, entity_id, overall_score,
         sla_compliance, resolution_rate, avg_speed_score, citizen_satisfaction, non_recurrence, response_rate)
         VALUES ('department', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [dept.name, dept.id, overall, slaScore, resRate, speedScore, satisfactionScore, recurrenceScore, responseScore]
      );
    }
  }

  saveDb();
  console.log('📊 Performance scores recalculated');
}

module.exports = { calculatePerformanceScores };
