const express = require('express');
const { getDB } = require('../database');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get('/dashboard', (req, res) => {
  const db = getDB();
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
  const verifiedUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE verified = 1').get();
  const totalTasks = db.prepare('SELECT COUNT(*) as count FROM tasks').get();
  const completedTasks = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE completed = 1').get();
  const totalHabits = db.prepare('SELECT COUNT(*) as count FROM habits').get();
  const totalJournal = db.prepare('SELECT COUNT(*) as count FROM journal_entries').get();
  const totalMoods = db.prepare('SELECT COUNT(*) as count FROM mood_logs').get();
  const totalGoals = db.prepare('SELECT COUNT(*) as count FROM goals').get();
  const totalCourses = db.prepare('SELECT COUNT(*) as count FROM courses').get();
  const totalPomodoros = db.prepare('SELECT COUNT(*) as count FROM pomodoro_sessions').get();
  const pomodoroMinutes = db.prepare('SELECT COALESCE(SUM(duration), 0) as total FROM pomodoro_sessions').get();
  const recentUsers = db.prepare('SELECT id, name, email, role, verified, created_at FROM users ORDER BY created_at DESC LIMIT 5').all();
  const moodDistribution = db.prepare('SELECT mood, COUNT(*) as count FROM mood_logs GROUP BY mood ORDER BY count DESC').all();
  const todayUsers = db.prepare("SELECT COUNT(*) as count FROM mood_logs WHERE date = date('now')").get();
  const taskQuadrants = db.prepare('SELECT quadrant, COUNT(*) as count FROM tasks GROUP BY quadrant').all();
  res.json({
    totalUsers: totalUsers.count,
    verifiedUsers: verifiedUsers.count,
    totalTasks: totalTasks.count,
    completedTasks: completedTasks.count,
    totalHabits: totalHabits.count,
    totalJournal: totalJournal.count,
    totalMoods: totalMoods.count,
    totalGoals: totalGoals.count,
    totalCourses: totalCourses.count,
    totalPomodoros: totalPomodoros.count,
    pomodoroMinutes: pomodoroMinutes.total,
    recentUsers,
    moodDistribution,
    activeToday: todayUsers.count,
    taskQuadrants
  });
});

router.get('/users', (req, res) => {
  const db = getDB();
  const { search } = req.query;
  let users;
  if (search) {
    users = db.prepare("SELECT id, name, email, role, verified, created_at FROM users WHERE name LIKE ? OR email LIKE ? ORDER BY created_at DESC").all(`%${search}%`, `%${search}%`);
  } else {
    users = db.prepare('SELECT id, name, email, role, verified, created_at FROM users ORDER BY created_at DESC').all();
  }
  const enriched = users.map(u => {
    const taskCount = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE user_id = ?').get(u.id);
    const habitCount = db.prepare('SELECT COUNT(*) as count FROM habits WHERE user_id = ?').get(u.id);
    const moodCount = db.prepare('SELECT COUNT(*) as count FROM mood_logs WHERE user_id = ?').get(u.id);
    return { ...u, tasksCount: taskCount.count, habitsCount: habitCount.count, moodsCount: moodCount.count };
  });
  res.json({ users: enriched });
});

router.put('/users/:id/role', (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  const db = getDB();
  if (req.params.id === req.userId && role !== 'admin') {
    return res.status(400).json({ error: 'Cannot demote yourself' });
  }
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  res.json({ message: 'Role updated' });
});

router.put('/users/:id/verify', (req, res) => {
  const db = getDB();
  const user = db.prepare('SELECT verified FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  db.prepare('UPDATE users SET verified = 1, otp = NULL, otp_expires = NULL, otp_attempts = NULL WHERE id = ?').run(req.params.id);
  res.json({ message: 'User verified' });
});

router.delete('/users/:id', (req, res) => {
  const db = getDB();
  if (req.params.id === req.userId) return res.status(400).json({ error: 'Cannot delete yourself' });
  db.prepare('DELETE FROM pomodoro_sessions WHERE user_id = ?').run(req.params.id);
  db.prepare('DELETE FROM habit_logs WHERE user_id = ?').run(req.params.id);
  db.prepare('DELETE FROM habits WHERE user_id = ?').run(req.params.id);
  db.prepare('DELETE FROM journal_entries WHERE user_id = ?').run(req.params.id);
  db.prepare('DELETE FROM mood_logs WHERE user_id = ?').run(req.params.id);
  db.prepare('DELETE FROM goals WHERE user_id = ?').run(req.params.id);
  db.prepare('DELETE FROM courses WHERE user_id = ?').run(req.params.id);
  db.prepare('DELETE FROM tasks WHERE user_id = ?').run(req.params.id);
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ message: 'User and all data deleted' });
});

router.get('/tasks', (req, res) => {
  const db = getDB();
  const { quadrant, completed, search } = req.query;
  let query = 'SELECT t.*, u.name as user_name, u.email as user_email FROM tasks t JOIN users u ON t.user_id = u.id WHERE 1=1';
  const params = [];
  if (quadrant) { query += ' AND t.quadrant = ?'; params.push(quadrant); }
  if (completed !== undefined) { query += ' AND t.completed = ?'; params.push(completed === '1' ? 1 : 0); }
  if (search) { query += ' AND (t.title LIKE ? OR u.name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  query += ' ORDER BY t.created_at DESC LIMIT 100';
  const tasks = db.prepare(query).all(...params);
  res.json({ tasks });
});

router.get('/analytics', (req, res) => {
  const db = getDB();
  const dailySignups = db.prepare("SELECT date(created_at) as date, COUNT(*) as count FROM users GROUP BY date(created_at) ORDER BY date DESC LIMIT 30").all();
  const dailyMoods = db.prepare("SELECT date, COUNT(*) as count FROM mood_logs GROUP BY date ORDER BY date DESC LIMIT 30").all();
  const dailyPomodoros = db.prepare("SELECT date, COUNT(*) as sessions, SUM(duration) as minutes FROM pomodoro_sessions GROUP BY date ORDER BY date DESC LIMIT 30").all();
  const topUsers = db.prepare(`
    SELECT u.id, u.name, u.email,
      (SELECT COUNT(*) FROM tasks WHERE user_id = u.id) as tasks,
      (SELECT COUNT(*) FROM habits WHERE user_id = u.id) as habits,
      (SELECT COUNT(*) FROM mood_logs WHERE user_id = u.id) as moods,
      (SELECT COUNT(*) FROM pomodoro_sessions WHERE user_id = u.id) as pomodoros
    FROM users u ORDER BY (SELECT COUNT(*) FROM tasks WHERE user_id = u.id) DESC LIMIT 10
  `).all();
  const moodDist = db.prepare('SELECT mood, COUNT(*) as count FROM mood_logs GROUP BY mood').all();
  const completionRate = db.prepare("SELECT (SELECT COUNT(*) FROM tasks WHERE completed = 1) * 1.0 / NULLIF((SELECT COUNT(*) FROM tasks), 0) * 100 as rate").get();
  res.json({ dailySignups, dailyMoods, dailyPomodoros, topUsers, moodDistribution: moodDist, completionRate: Math.round(completionRate?.rate || 0) });
});

router.get('/activity', (req, res) => {
  const db = getDB();
  const days = req.query.days ? Math.min(Math.max(parseInt(req.query.days) || 7, 1), 365) : 7;

  const newUsers = db.prepare("SELECT 'user' as type, id, name, email, created_at as time FROM users WHERE created_at >= datetime('now', ? || ' days') ORDER BY created_at DESC LIMIT 20").all(`-${days}`);
  const newMoods = db.prepare("SELECT 'mood' as type, m.id, u.name, m.mood, m.created_at as time FROM mood_logs m JOIN users u ON m.user_id = u.id WHERE m.created_at >= datetime('now', ? || ' days') ORDER BY m.created_at DESC LIMIT 20").all(`-${days}`);
  const newTasks = db.prepare("SELECT 'task' as type, t.id, u.name, t.title, t.created_at as time FROM tasks t JOIN users u ON t.user_id = u.id WHERE t.created_at >= datetime('now', ? || ' days') ORDER BY t.created_at DESC LIMIT 20").all(`-${days}`);
  const newPomodoros = db.prepare("SELECT 'pomodoro' as type, p.id, u.name, p.duration, p.created_at as time FROM pomodoro_sessions p JOIN users u ON p.user_id = u.id WHERE p.created_at >= datetime('now', ? || ' days') ORDER BY p.created_at DESC LIMIT 20").all(`-${days}`);

  const allActivity = [...newUsers.map(a => ({ ...a, label: `${a.name} joined` })), ...newMoods.map(a => ({ ...a, label: `${a.name} logged mood: ${a.mood}` })), ...newTasks.map(a => ({ ...a, label: `${a.name} created task: ${a.title}` })), ...newPomodoros.map(a => ({ ...a, label: `${a.name} completed ${a.duration}min pomodoro` }))]
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 50);
  res.json({ activity: allActivity });
});

router.get('/settings', (req, res) => {
  const db = getDB();
  const settings = db.prepare('SELECT name, email, role, created_at FROM users WHERE id = ?').get(req.userId);
  const dbSize = db.prepare("SELECT page_count * page_size as size FROM pragma_page_count, pragma_page_size").get();
  const stats = {
    totalUsers: db.prepare('SELECT COUNT(*) as c FROM users').get().c,
    totalTasks: db.prepare('SELECT COUNT(*) as c FROM tasks').get().c,
    totalEntries: db.prepare('SELECT COUNT(*) as c FROM journal_entries').get().c +
      db.prepare('SELECT COUNT(*) as c FROM mood_logs').get().c +
      db.prepare('SELECT COUNT(*) as c FROM habits').get().c
  };
  res.json({ admin: settings, dbSize: dbSize?.size || 0, stats });
});

module.exports = router;
