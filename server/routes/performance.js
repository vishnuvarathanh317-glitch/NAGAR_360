const express = require('express');
const { all } = require('../config/database');

const router = express.Router();

router.get('/rankings', (req, res) => {
  try {
    const type = req.query.type || 'department';

    const rankings = all(
      `SELECT * FROM performance_scores WHERE entity_type = ? ORDER BY overall_score DESC`,
      [type]
    );

    res.json({ type, rankings });
  } catch (err) {
    console.error('Performance error:', err);
    res.status(500).json({ error: 'Failed to get rankings.' });
  }
});

module.exports = router;
