const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  const db = getDB();
  const habits = db.prepare('SELECT * FROM habits WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
  const result = habits.map(h => {
    const logs = db.prepare('SELECT * FROM habit_logs WHERE habit_id = ? AND user_id = ? ORDER BY date DESC LIMIT 7').all(h.id, req.userId);
    return { ...h, logs };
  });
  res.json({ habits: result });
});

router.post('/', authenticate, (req, res) => {
  const { name, icon, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const db = getDB();
  const id = uuidv4();
  db.prepare('INSERT INTO habits (id, user_id, name, icon, color) VALUES (?, ?, ?, ?, ?)').run(id, req.userId, name, icon || 'self_improvement', color || 'primary');
  res.json({ habit: { id, name, icon: icon || 'self_improvement', color: color || 'primary', streak: 0, logs: [] } });
});

router.put('/:id/check', authenticate, (req, res) => {
  const db = getDB();
  const habit = db.prepare('SELECT * FROM habits WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!habit) return res.status(404).json({ error: 'Habit not found' });
  const today = new Date().toISOString().split('T')[0];
  const existing = db.prepare('SELECT * FROM habit_logs WHERE habit_id = ? AND user_id = ? AND date = ?').get(req.params.id, req.userId, today);
  if (existing) {
    db.prepare('DELETE FROM habit_logs WHERE id = ?').run(existing.id);
  } else {
    const id = uuidv4();
    db.prepare('INSERT INTO habit_logs (id, habit_id, user_id, date, completed) VALUES (?, ?, ?, ?, 1)').run(id, req.params.id, req.userId, today);
  }
  const logs = db.prepare('SELECT * FROM habit_logs WHERE habit_id = ? AND user_id = ? ORDER BY date DESC').all(req.params.id, req.userId);
  res.json({ logs });
});

router.delete('/:id', authenticate, (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM habit_logs WHERE habit_id = ?').run(req.params.id);
  db.prepare('DELETE FROM habits WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ message: 'Habit deleted' });
});

module.exports = router;
