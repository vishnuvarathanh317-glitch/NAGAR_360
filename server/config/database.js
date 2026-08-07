const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

let db = null;
const DB_PATH = path.join(__dirname, '..', 'nagar360.db');

async function initDatabase() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
    console.log('📂 Loaded existing database');
  } else {
    db = new SQL.Database();
    console.log('🆕 Created new database');
  }

  initializeSchema();
  saveDb();
  return db;
}

function initializeSchema() {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uid TEXT UNIQUE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    phone TEXT,
    role TEXT DEFAULT 'citizen',
    department_id INTEGER,
    created_at DATETIME DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    created_at DATETIME DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS districts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    city TEXT,
    state TEXT,
    created_at DATETIME DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS wards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    district_id INTEGER,
    created_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (district_id) REFERENCES districts(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS complaints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    complaint_id TEXT UNIQUE NOT NULL,
    citizen_id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    ai_category TEXT,
    ai_confidence REAL,
    ai_description TEXT,
    ai_possible_risk TEXT,
    severity TEXT DEFAULT 'medium',
    severity_score INTEGER DEFAULT 50,
    status TEXT DEFAULT 'submitted',
    priority TEXT DEFAULT 'medium',
    department_id INTEGER,
    assigned_officer_id INTEGER,
    location_id INTEGER,
    upvote_count INTEGER DEFAULT 0,
    citizen_verification TEXT,
    resolution_notes TEXT,
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now')),
    resolved_at DATETIME,
    FOREIGN KEY (department_id) REFERENCES departments(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    latitude REAL,
    longitude REAL,
    address TEXT,
    city TEXT,
    district TEXT,
    ward TEXT,
    pincode TEXT,
    created_at DATETIME DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS complaint_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    complaint_id INTEGER,
    image_url TEXT NOT NULL,
    image_type TEXT DEFAULT 'before',
    uploaded_by INTEGER,
    created_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (complaint_id) REFERENCES complaints(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS status_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    complaint_id INTEGER,
    from_status TEXT,
    to_status TEXT,
    changed_by INTEGER,
    notes TEXT,
    changed_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (complaint_id) REFERENCES complaints(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS sla_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    complaint_id INTEGER UNIQUE,
    priority TEXT,
    deadline DATETIME,
    is_breached INTEGER DEFAULT 0,
    breached_at DATETIME,
    escalation_level INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (complaint_id) REFERENCES complaints(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS escalations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    complaint_id INTEGER,
    sla_record_id INTEGER,
    escalation_level INTEGER DEFAULT 1,
    escalated_to TEXT,
    reason TEXT,
    created_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (complaint_id) REFERENCES complaints(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS resolution_evidence (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    complaint_id INTEGER,
    before_image_url TEXT,
    after_image_url TEXT,
    officer_id INTEGER,
    resolution_notes TEXT,
    work_description TEXT,
    created_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (complaint_id) REFERENCES complaints(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS citizen_verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    complaint_id INTEGER,
    citizen_id INTEGER,
    verification TEXT,
    comments TEXT,
    created_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (complaint_id) REFERENCES complaints(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS duplicate_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    primary_complaint_id INTEGER,
    duplicate_complaint_id INTEGER,
    distance_meters REAL,
    created_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (primary_complaint_id) REFERENCES complaints(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    complaint_id INTEGER,
    type TEXT,
    message TEXT,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS performance_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT,
    entity_name TEXT,
    entity_id INTEGER,
    overall_score REAL DEFAULT 0,
    sla_compliance REAL DEFAULT 0,
    resolution_rate REAL DEFAULT 0,
    avg_speed_score REAL DEFAULT 0,
    citizen_satisfaction REAL DEFAULT 0,
    non_recurrence REAL DEFAULT 0,
    response_rate REAL DEFAULT 0,
    calculated_at DATETIME DEFAULT (datetime('now')),
    UNIQUE(entity_type, entity_name)
  )`);

  console.log('✅ Database schema initialized');
}

function run(sql, params = []) {
  try {
    db.run(sql, params);
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      const stmt = db.prepare(sql);
      if (params.length) stmt.bind(params);
      if (stmt.step()) {
        const result = stmt.getAsObject();
        stmt.free();
        return result;
      }
      stmt.free();
      return null;
    }
  } catch (err) {
    if (!err.message.includes('UNIQUE constraint')) {
      console.error('DB run error:', err.message);
    }
  }
}

function get(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    if (params.length) stmt.bind(params);
    if (stmt.step()) {
      const result = stmt.getAsObject();
      stmt.free();
      return result;
    }
    stmt.free();
    return null;
  } catch (err) {
    console.error('DB get error:', err.message);
    return null;
  }
}

function all(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    if (params.length) stmt.bind(params);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  } catch (err) {
    console.error('DB all error:', err.message);
    return [];
  }
}

function saveDb() {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('DB save error:', err.message);
  }
}

module.exports = { initDatabase, run, get, all, saveDb };
