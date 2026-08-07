const { all } = require('../config/database');
const { haversineDistance } = require('./locationService');

const DUPLICATE_RADIUS_METERS = 150;
const RECURRING_MONTHS = 6;

function findDuplicates(category, lat, lng) {
  if (!lat || !lng) return { duplicates: [], recurring: [] };

  const recent = all(`
    SELECT c.id, c.complaint_id, c.title, c.category, c.status, c.created_at, c.upvote_count,
           l.latitude, l.longitude
    FROM complaints c
    JOIN locations l ON c.location_id = l.id
    WHERE c.category = ?
    AND c.status NOT IN ('closed')
    AND l.latitude IS NOT NULL
  `, [category]);

  const duplicates = [];
  const recurring = [];
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - RECURRING_MONTHS);

  for (const r of recent) {
    const dist = haversineDistance(lat, lng, r.latitude, r.longitude);
    if (dist <= DUPLICATE_RADIUS_METERS) {
      if (r.status === 'resolved' || r.status === 'citizen_verified') {
        if (new Date(r.created_at) > cutoff) {
          recurring.push({ ...r, distance: Math.round(dist) });
        }
      } else {
        duplicates.push({ ...r, distance: Math.round(dist) });
      }
    }
  }

  return { duplicates, recurring };
}

module.exports = { findDuplicates };
