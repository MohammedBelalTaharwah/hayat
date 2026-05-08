const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  const { mode, quadrant } = req.query;
  let query = 'SELECT * FROM tasks WHERE user_id = $1';
  const params = [req.userId];
  let idx = 2;
  if (mode) { query += ` AND mode = $${idx++}`; params.push(mode); }
  if (quadrant) { query += ` AND quadrant = $${idx++}`; params.push(quadrant); }
  query += ' ORDER BY created_at DESC';
  const tasks = await db.all(query, params);
  res.json({ tasks });
});

router.post('/', authenticate, async (req, res) => {
  const { title, description, quadrant, due_date, due_time, priority, assigned_to, mode } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const id = uuidv4();
  await db.query(
    `INSERT INTO tasks (id, user_id, title, description, quadrant, due_date, due_time, priority, assigned_to, mode)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [id, req.userId, title, description || '', quadrant || 'not_urgent_important', due_date || null, due_time || null, priority || 'medium', assigned_to || null, mode || 'eisenhower']
  );
  res.json({ task: { id, title, description: description || '', quadrant: quadrant || 'not_urgent_important', due_date: due_date || null, due_time: due_time || null, priority: priority || 'medium', assigned_to: assigned_to || null, mode: mode || 'eisenhower', completed: 0 } });
});

router.put('/:id', authenticate, async (req, res) => {
  const existing = await db.get('SELECT * FROM tasks WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
  if (!existing) return res.status(404).json({ error: 'Task not found' });
  const { title, description, quadrant, due_date, due_time, priority, completed, assigned_to } = req.body;
  await db.query(
    `UPDATE tasks SET title = COALESCE($1, title), description = COALESCE($2, description), quadrant = COALESCE($3, quadrant), due_date = COALESCE($4, due_date), due_time = COALESCE($5, due_time), priority = COALESCE($6, priority), completed = COALESCE($7, completed), assigned_to = COALESCE($8, assigned_to) WHERE id = $9 AND user_id = $10`,
    [title || null, description || null, quadrant || null, due_date || null, due_time || null, priority || null, completed !== undefined ? (completed ? 1 : 0) : null, assigned_to || null, req.params.id, req.userId]
  );
  const updated = await db.get('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
  res.json({ task: updated });
});

router.delete('/:id', authenticate, async (req, res) => {
  const result = await db.query('DELETE FROM tasks WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
  if (result.rowCount === 0) return res.status(404).json({ error: 'Task not found' });
  res.json({ message: 'Task deleted' });
});

module.exports = router;
