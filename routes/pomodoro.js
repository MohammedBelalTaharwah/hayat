const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/sessions', authenticate, (req, res) => {
  const db = getDB();
  const { days } = req.query;
  const limit = days || 30;
  const sessions = db.prepare('SELECT * FROM pomodoro_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?').all(req.userId, parseInt(limit));
  res.json({ sessions });
});

router.post('/sessions', authenticate, (req, res) => {
  const { duration, type, task_id, notes } = req.body;
  if (!duration) return res.status(400).json({ error: 'Duration required' });
  const db = getDB();
  const id = uuidv4();
  db.prepare('INSERT INTO pomodoro_sessions (id, user_id, duration, type, task_id, notes) VALUES (?, ?, ?, ?, ?, ?)').run(id, req.userId, duration, type || 'focus', task_id || null, notes || '');
  const session = db.prepare('SELECT * FROM pomodoro_sessions WHERE id = ?').get(id);
  res.json({ session });
});

router.get('/stats', authenticate, (req, res) => {
  const db = getDB();
  const today = new Date().toISOString().split('T')[0];
  const todaySessions = db.prepare('SELECT COUNT(*) as count, COALESCE(SUM(duration), 0) as total_minutes FROM pomodoro_sessions WHERE user_id = ? AND date = ?').get(req.userId, today);
  const totalSessions = db.prepare('SELECT COUNT(*) as count, COALESCE(SUM(duration), 0) as total_minutes FROM pomodoro_sessions WHERE user_id = ?').get(req.userId);
  res.json({ today: todaySessions, total: totalSessions });
});

module.exports = router;
