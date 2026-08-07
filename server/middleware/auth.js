const jwt = require('jsonwebtoken');
const { get } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'nagar360_civic_secret_2026';

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Allow anonymous access for citizen submissions
    req.user = { id: 1, role: 'citizen', name: 'Anonymous Citizen' };
    return next();
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = get('SELECT * FROM users WHERE id = ?', [decoded.id]);
    if (!user) {
      req.user = { id: 1, role: 'citizen', name: 'Anonymous Citizen' };
      return next();
    }
    req.user = user;
    next();
  } catch (err) {
    req.user = { id: 1, role: 'citizen', name: 'Anonymous Citizen' };
    next();
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions.' });
    }
    next();
  };
}

module.exports = { authMiddleware, requireRole, JWT_SECRET };
