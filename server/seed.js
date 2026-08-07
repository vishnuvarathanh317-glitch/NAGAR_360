const { initDatabase, run, saveDb } = require('./config/database');
const bcrypt = require('bcryptjs');

async function seed() {
  console.log('🌱 Starting nagar360 Database Seeder...');
  await initDatabase();

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Departments
  const departments = [
    { name: 'Road Maintenance Department', code: 'ROAD', desc: 'Potholes, footpaths, bridges and road obstructions' },
    { name: 'Waste Management Department', code: 'WASTE', desc: 'Garbage accumulation, overflowing bins, sanitation' },
    { name: 'Electrical & Signals Department', code: 'ELECTRICAL', desc: 'Streetlights, traffic signals, power hazards' },
    { name: 'Water & Sewerage Department', code: 'WATER', desc: 'Water leakages, drainage overflows, pipeline bursts' },
    { name: 'Parks & Environment Department', code: 'PARKS', desc: 'Fallen trees, green spaces, public park maintenance' }
  ];

  for (const d of departments) {
    run(
      `INSERT OR IGNORE INTO departments (name, code, description, contact_email, contact_phone)
       VALUES (?, ?, ?, ?, ?)`,
      [d.name, d.code, d.desc, `${d.code.toLowerCase()}@nagar360.gov.in`, '1800-111-2222']
    );
  }

  // 2. Districts & Wards
  run(`INSERT OR IGNORE INTO districts (name, code, city, state) VALUES ('Central District', 'CENTRAL', 'Chennai', 'Tamil Nadu')`);
  run(`INSERT OR IGNORE INTO districts (name, code, city, state) VALUES ('North District', 'NORTH', 'Chennai', 'Tamil Nadu')`);
  run(`INSERT OR IGNORE INTO districts (name, code, city, state) VALUES ('South District', 'SOUTH', 'Chennai', 'Tamil Nadu')`);

  run(`INSERT OR IGNORE INTO wards (name, code, district_id) VALUES ('Ward 104 - T. Nagar', 'W104', 1)`);
  run(`INSERT OR IGNORE INTO wards (name, code, district_id) VALUES ('Ward 112 - Nungambakkam', 'W112', 1)`);
  run(`INSERT OR IGNORE INTO wards (name, code, district_id) VALUES ('Ward 85 - Anna Nagar', 'W85', 2)`);
  run(`INSERT OR IGNORE INTO wards (name, code, district_id) VALUES ('Ward 140 - Adyar', 'W140', 3)`);
  run(`INSERT OR IGNORE INTO wards (name, code, district_id) VALUES ('Ward 155 - Velachery', 'W155', 3)`);

  // 3. Users
  const users = [
    { uid: 'cit-1', name: 'Anand Kumar', email: 'citizen@civicai.gov.in', role: 'citizen', phone: '9876543210' },
    { uid: 'off-1', name: 'Officer Rajesh Sharma', email: 'officer@civicai.gov.in', role: 'officer', dept: 1, phone: '9876543211' },
    { uid: 'off-2', name: 'Officer Priya V', email: 'priya@civicai.gov.in', role: 'officer', dept: 2, phone: '9876543212' },
    { uid: 'off-3', name: 'Officer Suresh M', email: 'suresh@civicai.gov.in', role: 'officer', dept: 3, phone: '9876543213' },
    { uid: 'admin-1', name: 'System Administrator', email: 'admin@civicai.gov.in', role: 'admin', phone: '9876543219' }
  ];

  for (const u of users) {
    run(
      `INSERT OR IGNORE INTO users (uid, name, email, password_hash, phone, role, department_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [u.uid, u.name, u.email, passwordHash, u.phone, u.role, u.dept || null]
    );
  }

  // 4. Sample Realistic Complaints
  const sampleComplaints = [
    {
      cid: 'CIV-2026-104821',
      title: 'Large Pothole on Anna Salai Main Road',
      description: 'Severe depression on outer lane posing major hazard for two-wheelers.',
      category: 'pothole',
      severity: 'high',
      score: 85,
      status: 'department_assigned',
      dept: 1,
      lat: 13.0604, lng: 80.2496,
      address: 'Anna Salai, Near Gemini Flyover, T. Nagar, Chennai',
      city: 'Chennai', ward: 'Ward 104 - T. Nagar',
      image: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=60'
    },
    {
      cid: 'CIV-2026-104822',
      title: 'Overflowing Garbage Bin near Bus Stop',
      description: 'Waste overflowing for 3 days attracting stray animals and blocking footpath.',
      category: 'overflowing_bin',
      severity: 'high',
      score: 78,
      status: 'work_started',
      dept: 2,
      lat: 13.0827, lng: 80.2707,
      address: 'Poonamallee High Road, Chennai Central',
      city: 'Chennai', ward: 'Ward 112 - Nungambakkam',
      image: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600&auto=format&fit=crop&q=60'
    },
    {
      cid: 'CIV-2026-104823',
      title: 'Broken Streetlight at 2nd Avenue Junction',
      description: 'Dark junction leading to unsafe night pedestrian crossing.',
      category: 'broken_streetlight',
      severity: 'medium',
      score: 55,
      status: 'resolved',
      dept: 3,
      lat: 13.0850, lng: 80.2100,
      address: '2nd Avenue, Anna Nagar East, Chennai',
      city: 'Chennai', ward: 'Ward 85 - Anna Nagar',
      image: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=600&auto=format&fit=crop&q=60',
      afterImage: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600&auto=format&fit=crop&q=60'
    },
    {
      cid: 'CIV-2026-104824',
      title: 'Water Leakage from Main Supply Pipe',
      description: 'Clean drinking water leaking continuously onto road surface for 24 hours.',
      category: 'water_leakage',
      severity: 'critical',
      score: 94,
      status: 'officer_acknowledged',
      dept: 4,
      lat: 13.0067, lng: 80.2570,
      address: 'LB Road, Adyar, Chennai',
      city: 'Chennai', ward: 'Ward 140 - Adyar',
      image: 'https://images.unsplash.com/photo-1584467735815-f778f274e296?w=600&auto=format&fit=crop&q=60'
    },
    {
      cid: 'CIV-2026-104825',
      title: 'Fallen Tree Branch Blocking Lane',
      description: 'Heavy storm caused large bough to fall across residential street.',
      category: 'fallen_tree',
      severity: 'medium',
      score: 62,
      status: 'citizen_verified',
      dept: 5,
      lat: 12.9789, lng: 80.2206,
      address: '100 Feet Bypass Road, Velachery, Chennai',
      city: 'Chennai', ward: 'Ward 155 - Velachery',
      image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&auto=format&fit=crop&q=60',
      afterImage: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&auto=format&fit=crop&q=60'
    }
  ];

  for (const c of sampleComplaints) {
    run(
      `INSERT OR IGNORE INTO locations (latitude, longitude, address, city, district, ward)
       VALUES (?, ?, ?, ?, 'Central District', ?)`,
      [c.lat, c.lng, c.address, c.city, c.ward]
    );

    run(
      `INSERT OR IGNORE INTO complaints (
        complaint_id, citizen_id, title, description, category, ai_category,
        ai_confidence, ai_description, ai_possible_risk, severity, severity_score,
        status, priority, department_id, assigned_officer_id, location_id,
        citizen_verification, resolved_at
      ) VALUES (?, 1, ?, ?, ?, ?, 0.92, ?, 'Public hazard detected', ?, ?, ?, ?, ?, 2, 1, ?, ?)`,
      [
        c.cid, c.title, c.description, c.category, c.category,
        c.description, c.severity, c.score, c.status, c.severity, c.dept,
        c.status === 'citizen_verified' ? 'yes' : null,
        c.status === 'resolved' || c.status === 'citizen_verified' ? new Date().toISOString() : null
      ]
    );

    run(
      `INSERT OR IGNORE INTO complaint_images (complaint_id, image_url, image_type, uploaded_by)
       VALUES ((SELECT id FROM complaints WHERE complaint_id = ?), ?, 'before', 1)`,
      [c.cid, c.image]
    );

    if (c.afterImage) {
      run(
        `INSERT OR IGNORE INTO complaint_images (complaint_id, image_url, image_type, uploaded_by)
         VALUES ((SELECT id FROM complaints WHERE complaint_id = ?), ?, 'after', 2)`,
        [c.cid, c.afterImage]
      );
      run(
        `INSERT OR IGNORE INTO resolution_evidence (complaint_id, before_image_url, after_image_url, officer_id, resolution_notes, work_description)
         VALUES ((SELECT id FROM complaints WHERE complaint_id = ?), ?, ?, 2, 'Work completed promptly.', 'Surface repaired and safety restored.')`,
        [c.cid, c.image, c.afterImage]
      );
    }

    const deadline = new Date(Date.now() + (c.severity === 'critical' ? 24 : 48) * 3600 * 1000).toISOString();
    run(
      `INSERT OR IGNORE INTO sla_records (complaint_id, priority, deadline, is_breached)
       VALUES ((SELECT id FROM complaints WHERE complaint_id = ?), ?, ?, 0)`,
      [c.cid, c.severity, deadline]
    );
  }

  saveDb();
  console.log('✅ nagar360 database seeded successfully!');
}

seed().catch(err => console.error('Seed error:', err));
