const express = require('express');
const { run, get, all, saveDb } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { getSlaStatus } = require('../services/slaService');

const router = express.Router();

// Officer Queue
router.get('/queue', authMiddleware, (req, res) => {
  try {
    const officerId = req.user.id;
    const { status, priority } = req.query;

    let sql = `
      SELECT c.*,
             d.name as department_name,
             l.latitude, l.longitude, l.address, l.city, l.ward,
             s.deadline, s.is_breached,
             (SELECT image_url FROM complaint_images WHERE complaint_id = c.id AND image_type = 'before' LIMIT 1) as before_image
      FROM complaints c
      LEFT JOIN departments d ON c.department_id = d.id
      LEFT JOIN locations l ON c.location_id = l.id
      LEFT JOIN sla_records s ON c.id = s.complaint_id
      WHERE (c.assigned_officer_id = ? OR c.department_id = ?)
    `;
    const params = [officerId, req.user.department_id || 1];

    if (status) { sql += ` AND c.status = ?`; params.push(status); }
    if (priority) { sql += ` AND c.priority = ?`; params.push(priority); }

    sql += ` ORDER BY s.is_breached DESC, c.severity_score DESC, c.created_at ASC`;

    const rawComplaints = all(sql, params);
    const complaints = rawComplaints.map(c => ({
      ...c,
      slaStatus: getSlaStatus(c.id)
    }));

    const counts = {
      new: complaints.filter(c => c.status === 'department_assigned' || c.status === 'ai_verified').length,
      inProgress: complaints.filter(c => c.status === 'work_started' || c.status === 'officer_acknowledged').length,
      overdue: complaints.filter(c => c.slaStatus?.isOverdue && !['resolved','citizen_verified'].includes(c.status)).length,
      highPriority: complaints.filter(c => c.priority === 'critical' || c.priority === 'high').length,
      resolved: complaints.filter(c => c.status === 'resolved' || c.status === 'citizen_verified').length
    };

    res.json({ counts, complaints });
  } catch (err) {
    console.error('Officer queue error:', err);
    res.status(500).json({ error: 'Failed to retrieve officer queue.' });
  }
});

// Update Status
router.patch('/complaints/:id/status', authMiddleware, (req, res) => {
  try {
    const { status, notes } = req.body;
    const allowed = ['officer_acknowledged', 'work_started', 'resolved'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }

    const complaint = get('SELECT * FROM complaints WHERE id = ? OR complaint_id = ?',
      [req.params.id, req.params.id]);
    if (!complaint) return res.status(404).json({ error: 'Not found.' });

    const prev = complaint.status;
    run(`UPDATE complaints SET status = ?, assigned_officer_id = ?, updated_at = datetime('now') WHERE id = ?`,
      [status, req.user.id, complaint.id]);
    run(`INSERT INTO status_history (complaint_id, from_status, to_status, changed_by, notes)
         VALUES (?, ?, ?, ?, ?)`,
      [complaint.id, prev, status, req.user.id, notes || `Status → ${status}`]);

    saveDb();
    res.json({ message: `Status updated to ${status}` });
  } catch (err) {
    console.error('Status update error:', err);
    res.status(500).json({ error: 'Failed to update status.' });
  }
});

// Resolve with Evidence
router.post('/complaints/:id/resolve', authMiddleware, upload.single('afterImage'), (req, res) => {
  try {
    const { resolutionNotes, workDescription } = req.body;

    const complaint = get('SELECT * FROM complaints WHERE id = ? OR complaint_id = ?',
      [req.params.id, req.params.id]);
    if (!complaint) return res.status(404).json({ error: 'Not found.' });

    const afterImageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const beforeImage = get(
      `SELECT image_url FROM complaint_images WHERE complaint_id = ? AND image_type = 'before' LIMIT 1`,
      [complaint.id]
    );

    const now = new Date().toISOString();

    run(`INSERT INTO resolution_evidence (complaint_id, before_image_url, after_image_url, officer_id, resolution_notes, work_description)
         VALUES (?, ?, ?, ?, ?, ?)`,
      [complaint.id, beforeImage?.image_url, afterImageUrl, req.user.id,
       resolutionNotes || 'Completed', workDescription || 'Resolution proof provided']);

    if (afterImageUrl) {
      run(`INSERT INTO complaint_images (complaint_id, image_url, image_type, uploaded_by)
           VALUES (?, ?, 'after', ?)`, [complaint.id, afterImageUrl, req.user.id]);
    }

    const prev = complaint.status;
    run(`UPDATE complaints SET status = 'resolved', resolution_notes = ?, resolved_at = ?, updated_at = ? WHERE id = ?`,
      [resolutionNotes || 'Resolved', now, now, complaint.id]);
    run(`INSERT INTO status_history (complaint_id, from_status, to_status, changed_by, notes)
         VALUES (?, ?, 'resolved', ?, ?)`,
      [complaint.id, prev, req.user.id, resolutionNotes || 'Resolved with evidence']);

    saveDb();
    res.json({ message: 'Resolved with proof!', complaintId: complaint.complaint_id });
  } catch (err) {
    console.error('Resolve error:', err);
    res.status(500).json({ error: 'Failed to resolve.' });
  }
});

module.exports = router;
