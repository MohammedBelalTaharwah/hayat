const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  const db = getDB();
  const { days } = req.query;
  const limit = days || 30;
  const moods = db.prepare('SELECT * FROM mood_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?').all(req.userId, parseInt(limit));
  res.json({ moods });
});

router.post('/', authenticate, (req, res) => {
  const { mood, notes } = req.body;
  if (!mood) return res.status(400).json({ error: 'Mood required' });
  const db = getDB();
  const today = new Date().toISOString().split('T')[0];
  const existing = db.prepare('SELECT * FROM mood_logs WHERE user_id = ? AND date = ?').get(req.userId, today);
  if (existing) {
    db.prepare('UPDATE mood_logs SET mood = ?, notes = ? WHERE id = ?').run(mood, notes || '', existing.id);
    const updated = db.prepare('SELECT * FROM mood_logs WHERE id = ?').get(existing.id);
    return res.json({ mood: updated });
  }
  const id = uuidv4();
  db.prepare('INSERT INTO mood_logs (id, user_id, mood, notes, date) VALUES (?, ?, ?, ?, ?)').run(id, req.userId, mood, notes || '', today);
  const entry = db.prepare('SELECT * FROM mood_logs WHERE id = ?').get(id);
  res.json({ mood: entry });
});

module.exports = router;
