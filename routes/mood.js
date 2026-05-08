const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  const { days } = req.query;
  const limit = parseInt(days) || 30;
  const moods = await db.all('SELECT * FROM mood_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2', [req.userId, limit]);
  res.json({ moods });
});

router.post('/', authenticate, async (req, res) => {
  const { mood, notes } = req.body;
  if (!mood) return res.status(400).json({ error: 'Mood required' });
  const today = new Date().toISOString().split('T')[0];
  const existing = await db.get('SELECT * FROM mood_logs WHERE user_id = $1 AND date = $2', [req.userId, today]);
  if (existing) {
    await db.query('UPDATE mood_logs SET mood = $1, notes = $2 WHERE id = $3', [mood, notes || '', existing.id]);
    const updated = await db.get('SELECT * FROM mood_logs WHERE id = $1', [existing.id]);
    return res.json({ mood: updated });
  }
  const id = uuidv4();
  await db.query('INSERT INTO mood_logs (id, user_id, mood, notes, date) VALUES ($1, $2, $3, $4, $5)', [id, req.userId, mood, notes || '', today]);
  const entry = await db.get('SELECT * FROM mood_logs WHERE id = $1', [id]);
  res.json({ mood: entry });
});

module.exports = router;
