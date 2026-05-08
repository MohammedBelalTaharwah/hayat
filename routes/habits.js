const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  const habits = await db.all('SELECT * FROM habits WHERE user_id = $1 ORDER BY created_at DESC', [req.userId]);
  const result = [];
  for (const h of habits) {
    const logs = await db.all('SELECT * FROM habit_logs WHERE habit_id = $1 AND user_id = $2 ORDER BY date DESC LIMIT 7', [h.id, req.userId]);
    result.push({ ...h, logs });
  }
  res.json({ habits: result });
});

router.post('/', authenticate, async (req, res) => {
  const { name, icon, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const id = uuidv4();
  await db.query('INSERT INTO habits (id, user_id, name, icon, color) VALUES ($1, $2, $3, $4, $5)', [id, req.userId, name, icon || 'self_improvement', color || 'primary']);
  res.json({ habit: { id, name, icon: icon || 'self_improvement', color: color || 'primary', streak: 0, logs: [] } });
});

router.put('/:id/check', authenticate, async (req, res) => {
  const habit = await db.get('SELECT * FROM habits WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
  if (!habit) return res.status(404).json({ error: 'Habit not found' });
  const today = new Date().toISOString().split('T')[0];
  const existing = await db.get('SELECT * FROM habit_logs WHERE habit_id = $1 AND user_id = $2 AND date = $3', [req.params.id, req.userId, today]);
  if (existing) {
    await db.query('DELETE FROM habit_logs WHERE id = $1', [existing.id]);
  } else {
    const id = uuidv4();
    await db.query('INSERT INTO habit_logs (id, habit_id, user_id, date, completed) VALUES ($1, $2, $3, $4, 1)', [id, req.params.id, req.userId, today]);
  }
  const logs = await db.all('SELECT * FROM habit_logs WHERE habit_id = $1 AND user_id = $2 ORDER BY date DESC', [req.params.id, req.userId]);
  res.json({ logs });
});

router.delete('/:id', authenticate, async (req, res) => {
  await db.query('DELETE FROM habit_logs WHERE habit_id = $1', [req.params.id]);
  await db.query('DELETE FROM habits WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
  res.json({ message: 'Habit deleted' });
});

module.exports = router;
