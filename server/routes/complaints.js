const express = require('express');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const { run, get, all, saveDb } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { analyzeImage } = require('../services/aiService');
const { reverseGeocode } = require('../services/locationService');
const { routeToDepartment, assignOfficer } = require('../services/routingService');
const { createSlaRecord, getSlaStatus } = require('../services/slaService');
const { findDuplicates } = require('../services/duplicateService');

const router = express.Router();

// 1. Submit a complaint (the full pipeline)
router.post('/submit', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { title, description, latitude, longitude } = req.body;
    const citizenId = req.user.id;

    // Step 1: AI Analysis
    let aiResult = { category: 'pothole', confidence: 0.5, severity: 'medium', severityScore: 50, isMock: true };
    if (req.file) {
      const imageBuffer = fs.readFileSync(req.file.path);
      aiResult = await analyzeImage(imageBuffer, req.file.mimetype);
    }

    // Step 2: Location
    const lat = parseFloat(latitude) || 13.0827;
    const lng = parseFloat(longitude) || 80.2707;
    let geo = { address: '', city: 'Chennai', district: 'Central District', ward: '', pincode: '' };
    try {
      geo = await reverseGeocode(lat, lng);
    } catch { /* use defaults */ }

    run(
      `INSERT INTO locations (latitude, longitude, address, city, district, ward, pincode)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [lat, lng, geo.address, geo.city, geo.district, geo.ward, geo.pincode]
    );
    const locationId = get('SELECT last_insert_rowid() as id')?.id || 1;

    // Step 3: Route to department
    const dept = routeToDepartment(aiResult.category);
    const officer = assignOfficer(dept.id);

    // Step 4: Check duplicates
    const { duplicates, recurring } = findDuplicates(aiResult.category, lat, lng);

    // Step 5: Create complaint
    const complaintId = `CIV-2026-${Date.now().toString().slice(-6)}`;
    const finalTitle = title || aiResult.suggestedTitle || `${aiResult.categoryLabel || aiResult.category} Report`;

    const isRealVal = aiResult.isReal ? 1 : 0;
    const validationReason = aiResult.validityReason || '';
    const imageDetailsStr = JSON.stringify(aiResult.imageDetails || {});

    run(
      `INSERT INTO complaints (
        complaint_id, citizen_id, title, description, category, ai_category,
        ai_confidence, ai_description, ai_possible_risk, severity, severity_score,
        status, priority, department_id, assigned_officer_id, location_id,
        ai_is_real, ai_validation_reason, ai_image_details
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'department_assigned', ?, ?, ?, ?, ?, ?, ?)`,
      [
        complaintId, citizenId, finalTitle, description || aiResult.description || '',
        aiResult.category, aiResult.category,
        aiResult.confidence, aiResult.description || '', aiResult.possibleRisk || '',
        aiResult.severity, aiResult.severityScore,
        aiResult.severity, dept.id, officer.id, locationId,
        isRealVal, validationReason, imageDetailsStr
      ]
    );

    const newComplaint = get('SELECT * FROM complaints WHERE complaint_id = ?', [complaintId]);

    // Step 6: Save image
    if (req.file) {
      run(
        `INSERT INTO complaint_images (complaint_id, image_url, image_type, uploaded_by)
         VALUES (?, ?, 'before', ?)`,
        [newComplaint.id, `/uploads/${req.file.filename}`, citizenId]
      );
    }

    // Step 7: Status history
    run(
      `INSERT INTO status_history (complaint_id, from_status, to_status, changed_by, notes)
       VALUES (?, 'new', 'submitted', ?, 'Complaint submitted by citizen')`,
      [newComplaint.id, citizenId]
    );
    run(
      `INSERT INTO status_history (complaint_id, from_status, to_status, changed_by, notes)
       VALUES (?, 'submitted', 'ai_verified', 0, ?)`,
      [newComplaint.id, `AI classified as ${aiResult.category} with ${Math.round(aiResult.confidence * 100)}% confidence`]
    );
    run(
      `INSERT INTO status_history (complaint_id, from_status, to_status, changed_by, notes)
       VALUES (?, 'ai_verified', 'department_assigned', 0, ?)`,
      [newComplaint.id, `Routed to ${dept.name}`]
    );

    // Step 8: SLA
    createSlaRecord(newComplaint.id, aiResult.severity);

    // Step 9: Send notification to the assigned officer
    run(
      `INSERT INTO notifications (user_id, complaint_id, type, message)
       VALUES (?, ?, 'new_assignment', ?)`,
      [officer.id, newComplaint.id, `New ${aiResult.categoryLabel || aiResult.category} reported: "${finalTitle}"`]
    );

    saveDb();

    res.status(201).json({
      message: 'Complaint submitted and routed successfully!',
      complaintId,
      complaint_id: complaintId,
      aiAnalysis: aiResult,
      department: { name: dept.name, code: dept.code },
      duplicatesNearby: duplicates.length,
      recurringIssue: recurring.length > 0
    });
  } catch (err) {
    console.error('Submit error:', err);
    res.status(500).json({ error: 'Failed to submit complaint.' });
  }
});

// 2. Track complaint
router.get('/track/:id', (req, res) => {
  try {
    const complaint = get(
      'SELECT * FROM complaints WHERE complaint_id = ? OR id = ?',
      [req.params.id, req.params.id]
    );
    if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });

    const location = get('SELECT * FROM locations WHERE id = ?', [complaint.location_id]);
    const department = get('SELECT * FROM departments WHERE id = ?', [complaint.department_id]);
    const history = all(
      'SELECT * FROM status_history WHERE complaint_id = ? ORDER BY changed_at ASC',
      [complaint.id]
    );
    const images = all('SELECT * FROM complaint_images WHERE complaint_id = ?', [complaint.id]);
    const sla = getSlaStatus(complaint.id);
    const evidence = get('SELECT * FROM resolution_evidence WHERE complaint_id = ?', [complaint.id]);
    const verifications = all('SELECT * FROM citizen_verifications WHERE complaint_id = ?', [complaint.id]);

    res.json({
      complaint, location, department, history, images, sla, evidence, verifications
    });
  } catch (err) {
    console.error('Track error:', err);
    res.status(500).json({ error: 'Failed to track complaint.' });
  }
});

// 3. List complaints
router.get('/list', (req, res) => {
  try {
    const { category, status, severity } = req.query;
    let sql = `
      SELECT c.*,
             d.name as department_name, d.code as department_code,
             l.latitude, l.longitude, l.address, l.city, l.ward,
             (SELECT image_url FROM complaint_images WHERE complaint_id = c.id AND image_type = 'before' LIMIT 1) as before_image
      FROM complaints c
      LEFT JOIN departments d ON c.department_id = d.id
      LEFT JOIN locations l ON c.location_id = l.id
      WHERE 1=1
    `;
    const params = [];
    if (category) { sql += ` AND c.category = ?`; params.push(category); }
    if (status) { sql += ` AND c.status = ?`; params.push(status); }
    if (severity) { sql += ` AND c.severity = ?`; params.push(severity); }
    sql += ` ORDER BY c.created_at DESC LIMIT 50`;

    const complaints = all(sql, params);

    // Add SLA remaining to each
    const enriched = complaints.map(c => {
      const sla = getSlaStatus(c.id);
      return { ...c, sla_remaining: sla?.remaining };
    });

    res.json({ count: enriched.length, complaints: enriched });
  } catch (err) {
    console.error('List error:', err);
    res.status(500).json({ error: 'Failed to list complaints.' });
  }
});

// 4. Upvote
router.post('/:id/upvote', (req, res) => {
  try {
    run('UPDATE complaints SET upvote_count = upvote_count + 1 WHERE id = ? OR complaint_id = ?',
      [req.params.id, req.params.id]);
    saveDb();
    res.json({ message: 'Upvoted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to upvote.' });
  }
});

// 5. Citizen Verification
router.post('/:id/verify', (req, res) => {
  try {
    const { verification, comments } = req.body;
    const complaint = get('SELECT * FROM complaints WHERE id = ? OR complaint_id = ?',
      [req.params.id, req.params.id]);
    if (!complaint) return res.status(404).json({ error: 'Not found.' });

    run(
      `INSERT INTO citizen_verifications (complaint_id, citizen_id, verification, comments) VALUES (?, 1, ?, ?)`,
      [complaint.id, verification, comments || '']
    );

    if (verification === 'yes') {
      run(`UPDATE complaints SET status = 'citizen_verified', citizen_verification = 'yes', updated_at = datetime('now') WHERE id = ?`,
        [complaint.id]);
      run(`INSERT INTO status_history (complaint_id, from_status, to_status, changed_by, notes)
           VALUES (?, 'resolved', 'citizen_verified', 1, 'Citizen confirmed resolution')`,
        [complaint.id]);
    } else if (verification === 'no') {
      run(`UPDATE complaints SET status = 'reopened', citizen_verification = 'no', updated_at = datetime('now') WHERE id = ?`,
        [complaint.id]);
    } else {
      run(`UPDATE complaints SET citizen_verification = 'partially', updated_at = datetime('now') WHERE id = ?`,
        [complaint.id]);
    }

    saveDb();
    res.json({ message: `Verification recorded: ${verification}` });
  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).json({ error: 'Verification failed.' });
  }
});

module.exports = router;
