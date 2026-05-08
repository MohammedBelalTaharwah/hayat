const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  const courses = await db.all('SELECT * FROM courses WHERE user_id = $1 ORDER BY created_at DESC', [req.userId]);
  res.json({ courses });
});

router.post('/', authenticate, async (req, res) => {
  const { title, provider, url, total_hours } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const id = uuidv4();
  await db.query('INSERT INTO courses (id, user_id, title, provider, url, total_hours) VALUES ($1, $2, $3, $4, $5, $6)', [id, req.userId, title, provider || '', url || '', total_hours || 0]);
  res.json({ course: { id, title, provider: provider || '', url: url || '', total_hours: total_hours || 0, completed_hours: 0, status: 'in_progress' } });
});

router.put('/:id', authenticate, async (req, res) => {
  const existing = await db.get('SELECT * FROM courses WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
  if (!existing) return res.status(404).json({ error: 'Course not found' });
  const { title, provider, url, completed_hours, status } = req.body;
  await db.query(
    `UPDATE courses SET title = COALESCE($1, title), provider = COALESCE($2, provider), url = COALESCE($3, url), completed_hours = COALESCE($4, completed_hours), status = COALESCE($5, status) WHERE id = $6 AND user_id = $7`,
    [title || null, provider || null, url || null, completed_hours !== undefined ? completed_hours : null, status || null, req.params.id, req.userId]
  );
  const updated = await db.get('SELECT * FROM courses WHERE id = $1', [req.params.id]);
  res.json({ course: updated });
});

router.delete('/:id', authenticate, async (req, res) => {
  await db.query('DELETE FROM courses WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
  res.json({ message: 'Course deleted' });
});

module.exports = router;
