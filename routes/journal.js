const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  const db = getDB();
  const entries = db.prepare('SELECT * FROM journal_entries WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
  res.json({ entries });
});

router.post('/', authenticate, (req, res) => {
  const { title, content, mood_tag } = req.body;
  if (!content) return res.status(400).json({ error: 'Content required' });
  const db = getDB();
  const id = uuidv4();
  db.prepare('INSERT INTO journal_entries (id, user_id, title, content, mood_tag) VALUES (?, ?, ?, ?, ?)').run(id, req.userId, title || '', content, mood_tag || null);
  const entry = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(id);
  res.json({ entry });
});

router.delete('/:id', authenticate, (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM journal_entries WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ message: 'Entry deleted' });
});

module.exports = router;
