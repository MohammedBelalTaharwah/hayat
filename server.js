const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { initDB } = require('./database');
const { authenticate } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const tasksRoutes = require('./routes/tasks');
const habitsRoutes = require('./routes/habits');
const journalRoutes = require('./routes/journal');
const moodRoutes = require('./routes/mood');
const goalsRoutes = require('./routes/goals');
const coursesRoutes = require('./routes/courses');
const pomodoroRoutes = require('./routes/pomodoro');
const dashboardRoutes = require('./routes/dashboard');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

const corsOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000'];
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? corsOrigins : true,
  credentials: true
}));

app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', globalLimiter);

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/habits', habitsRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/mood', moodRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/pomodoro', pomodoroRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);

app.use('/admin', authenticate, (req, res, next) => {
  const { getDB } = require('./database');
  const db = getDB();
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.userId);
  if (!user || user.role !== 'admin') {
    return res.status(403).send('Admin access required');
  }
  next();
}, express.static(path.join(__dirname, 'public', 'admin')));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(__dirname, 'public', req.path === '/' ? 'index.html' : req.path));
});

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required in production');
  process.exit(1);
}

if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] && !req.headers['x-forwarded-proto'].startsWith('https')) {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

initDB();
app.listen(PORT, () => console.log(`Hayati running on http://localhost:${PORT}`));
