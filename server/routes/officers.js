const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
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

// Get notifications for logged-in officer
router.get('/notifications', authMiddleware, (req, res) => {
  try {
    const officerId = req.user.id;
    const notifications = all(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [officerId]
    );
    res.json({ notifications });
  } catch (err) {
    console.error('Notifications error:', err);
    res.status(500).json({ error: 'Failed to retrieve notifications.' });
  }
});

// Mark notification as read
router.patch('/notifications/:id/read', authMiddleware, (req, res) => {
  try {
    const officerId = req.user.id;
    run(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [req.params.id, officerId]
    );
    saveDb();
    res.json({ success: true });
  } catch (err) {
    console.error('Read notification error:', err);
    res.status(500).json({ error: 'Failed to update notification.' });
  }
});

// Voice Command Processor for Officers
router.post('/voice-command', authMiddleware, async (req, res) => {
  try {
    const { command, queueSummary } = req.body;
    const officerId = req.user.id;
    const officerName = req.user.name;

    if (!command) {
      return res.status(400).json({ error: 'Command text required.' });
    }

    // Fetch active complaints for context
    const complaints = all(`
      SELECT c.id, c.complaint_id, c.title, c.category, c.status, c.severity, l.address
      FROM complaints c
      LEFT JOIN locations l ON c.location_id = l.id
      WHERE (c.assigned_officer_id = ? OR c.department_id = ?)
      AND c.status NOT IN ('resolved', 'citizen_verified')
    `, [officerId, req.user.department_id || 1]);

    // Fetch unread notifications
    const unreadNotifications = all(`
      SELECT * FROM notifications WHERE user_id = ? AND is_read = 0
    `, [officerId]);

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
    let voiceResult = null;

    if (GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        
        // Train the model with a strict JSON schema and response behavior
        const model = genAI.getGenerativeModel({
          model: 'gemini-2.0-flash',
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'object',
              properties: {
                speech: {
                  type: 'string',
                  description: 'A warm, natural, and helpful verbal response to read aloud. Use the officer\'s name, congratulate them on resolved actions, or warn them about overdue deadlines in their queue.'
                },
                action: {
                  type: 'string',
                  enum: ['highlight_complaint', 'update_status', 'read_notifications', 'summarize_queue', 'none'],
                  description: 'The structural action corresponding to the officer\'s request.'
                },
                complaintId: {
                  type: 'string',
                  description: 'The complaint ID (e.g. CIV-2026-104821) if referring to a specific complaint; otherwise null.',
                  nullable: true
                },
                status: {
                  type: 'string',
                  enum: ['officer_acknowledged', 'work_started', 'resolved'],
                  description: 'The target status if the action is update_status; otherwise null.',
                  nullable: true
                }
              },
              required: ['speech', 'action', 'complaintId', 'status']
            }
          }
        });

        const systemPrompt = `You are "CivicAI Prime", the dedicated, intelligent, and supportive voice assistant for Officer ${officerName} (ID: ${officerId}).
Your job is to interpret their spoken command, guide them through their workflow, speak in a conversational and professional tone, and return the structured action JSON.

Officer's Active Queue:
${JSON.stringify(complaints, null, 2)}

Officer's Unread Alerts:
${JSON.stringify(unreadNotifications, null, 2)}

Spoken Command: "${command}"

Here is training data (examples of commands, contexts, and correct responses):

EXAMPLE 1 (Acknowledge task):
- Command: "Acknowledge the water leak report"
- Context: Queue has water leak (CIV-2026-104824) in 'department_assigned' status.
- Output: {
    "speech": "Understood, Officer. I'm updating the status of the Adyar water leak report to Acknowledged. I'll highlight it on your dashboard now.",
    "action": "update_status",
    "complaintId": "CIV-2026-104824",
    "status": "officer_acknowledged"
  }

EXAMPLE 2 (Read notifications):
- Command: "Show me the alerts"
- Output: {
    "speech": "Certainly, Officer. Opening your notifications panel now. You have a new alert regarding an SLA breach.",
    "action": "read_notifications",
    "complaintId": null,
    "status": null
  }

EXAMPLE 3 (Summarize queue):
- Command: "What does my queue look like today?"
- Output: {
    "speech": "You currently have 3 active reports on your dashboard. This includes 1 brand new ticket and 1 overdue task requiring urgent action. Shall we start with the overdue one?",
    "action": "summarize_queue",
    "complaintId": null,
    "status": null
  }

EXAMPLE 4 (Highlight priority):
- Command: "What should I work on first?"
- Context: Queue has an overdue road repair (CIV-2026-104821).
- Output: {
    "speech": "Officer, your highest priority task is complaint CIV-2026-104821 for the Anna Salai pothole. It is currently overdue and needs immediate action. I've highlighted it for you.",
    "action": "highlight_complaint",
    "complaintId": "CIV-2026-104821",
    "status": null
  }

Interpret the officer's command and return the JSON object following the schema. Return only valid JSON.`;

        const result = await model.generateContent(systemPrompt);
        const text = result.response.text();
        const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        voiceResult = JSON.parse(cleaned);
      } catch (err) {
        console.error('Gemini Voice Assistant Error:', err.message);
      }
    }

    // Fallback parser if Gemini fails or is unavailable
    if (!voiceResult) {
      voiceResult = parseVoiceCommandFallback(command, complaints, unreadNotifications, queueSummary);
    }

    // If action is "update_status", execute the status update in the database
    if (voiceResult.action === 'update_status' && voiceResult.complaintId) {
      const complaint = get(
        'SELECT * FROM complaints WHERE complaint_id = ? OR id = ?',
        [voiceResult.complaintId, voiceResult.complaintId]
      );

      if (complaint) {
        const allowed = ['officer_acknowledged', 'work_started', 'resolved'];
        const targetStatus = voiceResult.status;

        if (allowed.includes(targetStatus)) {
          const prev = complaint.status;
          run(
            `UPDATE complaints SET status = ?, assigned_officer_id = ?, updated_at = datetime('now') WHERE id = ?`,
            [targetStatus, officerId, complaint.id]
          );
          run(
            `INSERT INTO status_history (complaint_id, from_status, to_status, changed_by, notes)
             VALUES (?, ?, ?, ?, ?)`,
            [complaint.id, prev, targetStatus, officerId, `Status updated via Voice Command: "${command}"`]
          );
          saveDb();
          voiceResult.speech = `Done. I've updated the status of issue ${complaint.complaint_id} to ${targetStatus.replace(/_/g, ' ')}.`;
        } else {
          voiceResult.speech = `I found complaint ${complaint.complaint_id}, but the status "${targetStatus}" is not valid.`;
          voiceResult.action = 'none';
        }
      } else {
        voiceResult.speech = `Sorry Officer, I could not find a complaint matching ${voiceResult.complaintId} in your queue.`;
        voiceResult.action = 'none';
      }
    }

    res.json({ result: voiceResult });
  } catch (err) {
    console.error('Voice command processor error:', err);
    res.status(500).json({ error: 'Failed to process voice command.' });
  }
});

// Helper for local keyword parsing fallback
function parseVoiceCommandFallback(command, complaints, notifications, queueSummary) {
  const norm = command.toLowerCase();
  
  // 1. Read Notifications
  if (norm.includes('notification') || norm.includes('alert') || norm.includes('unread')) {
    const unread = notifications.filter(n => n.is_read === 0);
    const speech = unread.length > 0 
      ? `You have ${unread.length} unread alerts. The latest is: ${unread[0].message}.`
      : "You have no unread notifications.";
    return {
      speech,
      action: "read_notifications",
      complaintId: null,
      status: null
    };
  }

  // 2. Summarize queue
  if (norm.includes('summarize') || norm.includes('stats') || norm.includes('count') || norm.includes('overview') || norm.includes('queue')) {
    const active = complaints.length;
    const speech = `Officer, your queue has ${active} active issues. You can say check, acknowledge, or resolve followed by the ID to manage them.`;
    return {
      speech,
      action: "summarize_queue",
      complaintId: null,
      status: null
    };
  }

  // 3. Acknowledge/Start/Resolve Status Updates
  const updateMatch = norm.match(/(acknowledge|start|begin|resolve|complete|done)\s*(?:complaint|issue|task)?\s*(?:civ-2026-)?(\d+)/i);
  if (updateMatch) {
    const verb = updateMatch[1];
    const digits = updateMatch[2];
    const matchedC = complaints.find(c => c.complaint_id.endsWith(digits) || String(c.id) === digits);

    if (matchedC) {
      let status = null;
      if (['acknowledge'].includes(verb)) status = 'officer_acknowledged';
      else if (['start', 'begin'].includes(verb)) status = 'work_started';
      else if (['resolve', 'complete', 'done'].includes(verb)) status = 'resolved';

      return {
        speech: `Sure, I'll update the status for complaint ${matchedC.complaint_id}.`,
        action: "update_status",
        complaintId: matchedC.complaint_id,
        status
      };
    }
  }

  // 4. Highlight/Check details of specific issue
  const checkMatch = norm.match(/(check|show|open|detail|view|highlight)\s*(?:complaint|issue|task)?\s*(?:civ-2026-)?(\d+)/i);
  if (checkMatch) {
    const digits = checkMatch[2];
    const matchedC = complaints.find(c => c.complaint_id.endsWith(digits) || String(c.id) === digits);
    if (matchedC) {
      return {
        speech: `Here is complaint ${matchedC.complaint_id} regarding ${matchedC.title}.`,
        action: "highlight_complaint",
        complaintId: matchedC.complaint_id,
        status: null
      };
    }
  }

  // 5. Default Response
  return {
    speech: "I heard you say: \"" + command + "\". I can help you summarize your queue, check alerts, or manage complaints. Please speak clearly.",
    action: "none",
    complaintId: null,
    status: null
  };
}

module.exports = router;
