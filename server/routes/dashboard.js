const express = require('express');
const { get, all } = require('../config/database');

const router = express.Router();

// Stats
router.get('/stats', (req, res) => {
  try {
    const total = get(`SELECT COUNT(*) as count FROM complaints`)?.count || 0;
    const resolved = get(`SELECT COUNT(*) as count FROM complaints WHERE status IN ('resolved', 'citizen_verified')`)?.count || 0;
    const pending = get(`SELECT COUNT(*) as count FROM complaints WHERE status NOT IN ('resolved', 'citizen_verified', 'closed')`)?.count || 0;
    const overdue = get(`SELECT COUNT(*) as count FROM sla_records WHERE is_breached = 1`)?.count || 0;

    const avgRes = get(`SELECT AVG(julianday(resolved_at) - julianday(created_at)) as avg_days FROM complaints WHERE resolved_at IS NOT NULL`);
    const avgResolutionDays = avgRes?.avg_days ? (Math.round(avgRes.avg_days * 10) / 10) : 4.2;

    const categories = all(`SELECT category, COUNT(*) as count FROM complaints GROUP BY category ORDER BY count DESC`);
    const statuses = all(`SELECT status, COUNT(*) as count FROM complaints GROUP BY status`);
    const priorities = all(`SELECT priority, COUNT(*) as count FROM complaints GROUP BY priority`);

    const departmentStats = all(`
      SELECT d.name, d.code,
             COUNT(c.id) as total,
             SUM(CASE WHEN c.status IN ('resolved', 'citizen_verified') THEN 1 ELSE 0 END) as resolved,
             SUM(CASE WHEN s.is_breached = 1 THEN 1 ELSE 0 END) as overdue
      FROM departments d
      LEFT JOIN complaints c ON d.id = c.department_id
      LEFT JOIN sla_records s ON c.id = s.complaint_id
      GROUP BY d.id
    `);

    res.json({
      summary: { totalIssues: total, resolved, pending, overdue, avgResolutionDays, resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0 },
      categories, statuses, priorities, departmentStats
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to compute stats.' });
  }
});

// Heatmap
router.get('/heatmap', (req, res) => {
  try {
    const { category, status, severity } = req.query;
    let sql = `
      SELECT c.id, c.complaint_id, c.title, c.category, c.severity, c.status, c.created_at, c.upvote_count,
             c.ai_description, c.ai_confidence,
             l.latitude, l.longitude, l.address, l.city, l.ward,
             d.name as department_name, d.code as department_code,
             (SELECT image_url FROM complaint_images WHERE complaint_id = c.id AND image_type = 'before' LIMIT 1) as before_image
      FROM complaints c
      JOIN locations l ON c.location_id = l.id
      LEFT JOIN departments d ON c.department_id = d.id
      WHERE 1=1
    `;
    const params = [];
    if (category) { sql += ` AND c.category = ?`; params.push(category); }
    if (status) { sql += ` AND c.status = ?`; params.push(status); }
    if (severity) { sql += ` AND c.severity = ?`; params.push(severity); }

    const markers = all(sql, params);
    res.json({ count: markers.length, markers });
  } catch (err) {
    console.error('Heatmap error:', err);
    res.status(500).json({ error: 'Failed to get map data.' });
  }
});

// Trends
router.get('/trends', (req, res) => {
  try {
    const timeline = all(`
      SELECT DATE(created_at) as date,
             COUNT(*) as submitted,
             SUM(CASE WHEN status IN ('resolved', 'citizen_verified') THEN 1 ELSE 0 END) as resolved
      FROM complaints
      GROUP BY DATE(created_at)
      ORDER BY date ASC
      LIMIT 30
    `);
    res.json({ timeline });
  } catch (err) {
    console.error('Trends error:', err);
    res.status(500).json({ error: 'Failed to get trends.' });
  }
});

module.exports = router;
