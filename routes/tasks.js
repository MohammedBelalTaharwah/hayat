const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  const db = getDB();
  const { mode, quadrant } = req.query;
  let query = 'SELECT * FROM tasks WHERE user_id = ?';
  const params = [req.userId];
  if (mode) { query += ' AND mode = ?'; params.push(mode); }
  if (quadrant) { query += ' AND quadrant = ?'; params.push(quadrant); }
  query += ' ORDER BY created_at DESC';
  const tasks = db.prepare(query).all(...params);
  res.json({ tasks });
});

router.post('/', authenticate, (req, res) => {
  const { title, description, quadrant, due_date, due_time, priority, assigned_to, mode } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const db = getDB();
  const id = uuidv4();
  db.prepare(`INSERT INTO tasks (id, user_id, title, description, quadrant, due_date, due_time, priority, assigned_to, mode)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, req.userId, title, description || '', quadrant || 'not_urgent_important', due_date || null, due_time || null, priority || 'medium', assigned_to || null, mode || 'eisenhower');
  res.json({ task: { id, title, description: description || '', quadrant: quadrant || 'not_urgent_important', due_date: due_date || null, due_time: due_time || null, priority: priority || 'medium', assigned_to: assigned_to || null, mode: mode || 'eisenhower', completed: 0 } });
});

router.put('/:id', authenticate, (req, res) => {
  const db = getDB();
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Task not found' });
  const { title, description, quadrant, due_date, due_time, priority, completed, assigned_to } = req.body;
  db.prepare(`UPDATE tasks SET title = COALESCE(?, title), description = COALESCE(?, description), quadrant = COALESCE(?, quadrant), due_date = COALESCE(?, due_date), due_time = COALESCE(?, due_time), priority = COALESCE(?, priority), completed = COALESCE(?, completed), assigned_to = COALESCE(?, assigned_to) WHERE id = ? AND user_id = ?`)
    .run(title || null, description || null, quadrant || null, due_date || null, due_time || null, priority || null, completed !== undefined ? (completed ? 1 : 0) : null, assigned_to || null, req.params.id, req.userId);
  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  res.json({ task: updated });
});

router.delete('/:id', authenticate, (req, res) => {
  const db = getDB();
  const result = db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  if (result.changes === 0) return res.status(404).json({ error: 'Task not found' });
  res.json({ message: 'Task deleted' });
});

module.exports = router;
