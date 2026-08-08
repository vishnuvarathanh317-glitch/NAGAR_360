const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const cron = require('node-cron');

const { initDatabase, get } = require('./config/database');
const { checkAndEscalateBreaches } = require('./services/slaService');
const { calculatePerformanceScores } = require('./services/performanceService');

const authRoutes = require('./routes/auth');
const complaintsRoutes = require('./routes/complaints');
const officersRoutes = require('./routes/officers');
const dashboardRoutes = require('./routes/dashboard');
const aiRoutes = require('./routes/ai');
const performanceRoutes = require('./routes/performance');

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Logging
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false
}));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Uploads static directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve built frontend in production single-deploy
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintsRoutes);
app.use('/api/officers', officersRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/performance', performanceRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Single SPA Fallback
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
    const indexPath = path.join(distPath, 'index.html');
    if (require('fs').existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
  }
  res.status(404).json({ error: 'Not found' });
});

// Initialize DB & Start Server
async function start() {
  await initDatabase();

  // Auto-seed database if empty (essential for Render deployments)
  try {
    const userCheck = get('SELECT COUNT(*) as count FROM users');
    if (!userCheck || userCheck.count === 0) {
      console.log('🌱 Database is empty. Running auto-seeding...');
      require('./seed');
    }
  } catch (err) {
    console.error('⚠️ Auto-seeding check failed:', err.message);
  }

  // Run initial performance calculation
  calculatePerformanceScores();

  // Schedule SLA Breach Check every 5 minutes
  cron.schedule('*/5 * * * *', () => {
    console.log('⏰ Running scheduled SLA breach check...');
    checkAndEscalateBreaches();
    calculatePerformanceScores();
  });

  app.listen(PORT, () => {
    console.log(`🚀 nagar360 Server running on http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
});
