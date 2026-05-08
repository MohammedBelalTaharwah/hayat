const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  const db = getDB();
  const courses = db.prepare('SELECT * FROM courses WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
  res.json({ courses });
});

router.post('/', authenticate, (req, res) => {
  const { title, provider, url, total_hours } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const db = getDB();
  const id = uuidv4();
  db.prepare('INSERT INTO courses (id, user_id, title, provider, url, total_hours) VALUES (?, ?, ?, ?, ?, ?)').run(id, req.userId, title, provider || '', url || '', total_hours || 0);
  res.json({ course: { id, title, provider: provider || '', url: url || '', total_hours: total_hours || 0, completed_hours: 0, status: 'in_progress' } });
});

router.put('/:id', authenticate, (req, res) => {
  const db = getDB();
  const existing = db.prepare('SELECT * FROM courses WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Course not found' });
  const { title, provider, url, completed_hours, status } = req.body;
  db.prepare(`UPDATE courses SET title = COALESCE(?, title), provider = COALESCE(?, provider), url = COALESCE(?, url), completed_hours = COALESCE(?, completed_hours), status = COALESCE(?, status) WHERE id = ? AND user_id = ?`)
    .run(title || null, provider || null, url || null, completed_hours !== undefined ? completed_hours : null, status || null, req.params.id, req.userId);
  const updated = db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id);
  res.json({ course: updated });
});

router.delete('/:id', authenticate, (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM courses WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ message: 'Course deleted' });
});

module.exports = router;
