const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/sessions', authenticate, async (req, res) => {
  const { days } = req.query;
  const limit = parseInt(days) || 30;
  const sessions = await db.all('SELECT * FROM pomodoro_sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2', [req.userId, limit]);
  res.json({ sessions });
});

router.post('/sessions', authenticate, async (req, res) => {
  const { duration, type, task_id, notes } = req.body;
  if (!duration) return res.status(400).json({ error: 'Duration required' });
  const id = uuidv4();
  await db.query('INSERT INTO pomodoro_sessions (id, user_id, duration, type, task_id, notes) VALUES ($1, $2, $3, $4, $5, $6)', [id, req.userId, duration, type || 'focus', task_id || null, notes || '']);
  const session = await db.get('SELECT * FROM pomodoro_sessions WHERE id = $1', [id]);
  res.json({ session });
});

router.get('/stats', authenticate, async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const todaySessions = await db.get('SELECT COUNT(*) as count, COALESCE(SUM(duration), 0) as total_minutes FROM pomodoro_sessions WHERE user_id = $1 AND date = $2', [req.userId, today]);
  const totalSessions = await db.get('SELECT COUNT(*) as count, COALESCE(SUM(duration), 0) as total_minutes FROM pomodoro_sessions WHERE user_id = $1', [req.userId]);
  res.json({ today: todaySessions, total: totalSessions });
});

module.exports = router;
