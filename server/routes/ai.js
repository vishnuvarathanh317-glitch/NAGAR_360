const express = require('express');
const upload = require('../middleware/upload');
const { analyzeImage, CIVIC_CATEGORIES } = require('../services/aiService');
const fs = require('fs');

const router = express.Router();

// Standalone AI analysis
router.post('/analyze', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image required.' });

    const imageBuffer = fs.readFileSync(req.file.path);
    const result = await analyzeImage(imageBuffer, req.file.mimetype);

    // Clean up temp file
    fs.unlink(req.file.path, () => {});

    res.json({ analysis: result });
  } catch (err) {
    console.error('AI analyze error:', err);
    res.status(500).json({ error: 'Analysis failed.' });
  }
});

// List categories
router.get('/categories', (req, res) => {
  const categories = Object.entries(CIVIC_CATEGORIES).map(([key, val]) => ({
    key,
    label: val.label,
    department: val.dept
  }));
  res.json({ categories });
});

module.exports = router;
