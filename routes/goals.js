const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  const db = getDB();
  const goals = db.prepare('SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
  res.json({ goals });
});

router.post('/', authenticate, (req, res) => {
  const { title, description, target_date, category } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const db = getDB();
  const id = uuidv4();
  db.prepare('INSERT INTO goals (id, user_id, title, description, target_date, category) VALUES (?, ?, ?, ?, ?, ?)').run(id, req.userId, title, description || '', target_date || null, category || 'personal');
  res.json({ goal: { id, title, description: description || '', target_date: target_date || null, category: category || 'personal', progress: 0 } });
});

router.put('/:id', authenticate, (req, res) => {
  const db = getDB();
  const existing = db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Goal not found' });
  const { title, description, target_date, progress, category } = req.body;
  db.prepare(`UPDATE goals SET title = COALESCE(?, title), description = COALESCE(?, description), target_date = COALESCE(?, target_date), progress = COALESCE(?, progress), category = COALESCE(?, category) WHERE id = ? AND user_id = ?`)
    .run(title || null, description || null, target_date || null, progress !== undefined ? progress : null, category || null, req.params.id, req.userId);
  const updated = db.prepare('SELECT * FROM goals WHERE id = ?').get(req.params.id);
  res.json({ goal: updated });
});

router.delete('/:id', authenticate, (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM goals WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ message: 'Goal deleted' });
});

module.exports = router;
