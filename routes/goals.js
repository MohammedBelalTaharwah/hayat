const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  const goals = await db.all('SELECT * FROM goals WHERE user_id = $1 ORDER BY created_at DESC', [req.userId]);
  res.json({ goals });
});

router.post('/', authenticate, async (req, res) => {
  const { title, description, target_date, category } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const id = uuidv4();
  await db.query('INSERT INTO goals (id, user_id, title, description, target_date, category) VALUES ($1, $2, $3, $4, $5, $6)', [id, req.userId, title, description || '', target_date || null, category || 'personal']);
  res.json({ goal: { id, title, description: description || '', target_date: target_date || null, category: category || 'personal', progress: 0 } });
});

router.put('/:id', authenticate, async (req, res) => {
  const existing = await db.get('SELECT * FROM goals WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
  if (!existing) return res.status(404).json({ error: 'Goal not found' });
  const { title, description, target_date, progress, category } = req.body;
  await db.query(
    `UPDATE goals SET title = COALESCE($1, title), description = COALESCE($2, description), target_date = COALESCE($3, target_date), progress = COALESCE($4, progress), category = COALESCE($5, category) WHERE id = $6 AND user_id = $7`,
    [title || null, description || null, target_date || null, progress !== undefined ? progress : null, category || null, req.params.id, req.userId]
  );
  const updated = await db.get('SELECT * FROM goals WHERE id = $1', [req.params.id]);
  res.json({ goal: updated });
});

router.delete('/:id', authenticate, async (req, res) => {
  await db.query('DELETE FROM goals WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
  res.json({ message: 'Goal deleted' });
});

module.exports = router;
