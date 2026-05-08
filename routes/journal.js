const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  const entries = await db.all('SELECT * FROM journal_entries WHERE user_id = $1 ORDER BY created_at DESC', [req.userId]);
  res.json({ entries });
});

router.post('/', authenticate, async (req, res) => {
  const { title, content, mood_tag } = req.body;
  if (!content) return res.status(400).json({ error: 'Content required' });
  const id = uuidv4();
  await db.query('INSERT INTO journal_entries (id, user_id, title, content, mood_tag) VALUES ($1, $2, $3, $4, $5)', [id, req.userId, title || '', content, mood_tag || null]);
  const entry = await db.get('SELECT * FROM journal_entries WHERE id = $1', [id]);
  res.json({ entry });
});

router.delete('/:id', authenticate, async (req, res) => {
  await db.query('DELETE FROM journal_entries WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
  res.json({ message: 'Entry deleted' });
});

module.exports = router;
