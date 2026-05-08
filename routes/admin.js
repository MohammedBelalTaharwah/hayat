const express = require('express');
const { db } = require('../database');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get('/dashboard', async (req, res) => {
  const totalUsers = (await db.get('SELECT COUNT(*) as count FROM users'));
  const verifiedUsers = (await db.get('SELECT COUNT(*) as count FROM users WHERE verified = 1'));
  const totalTasks = (await db.get('SELECT COUNT(*) as count FROM tasks'));
  const completedTasks = (await db.get('SELECT COUNT(*) as count FROM tasks WHERE completed = 1'));
  const totalHabits = (await db.get('SELECT COUNT(*) as count FROM habits'));
  const totalJournal = (await db.get('SELECT COUNT(*) as count FROM journal_entries'));
  const totalMoods = (await db.get('SELECT COUNT(*) as count FROM mood_logs'));
  const totalGoals = (await db.get('SELECT COUNT(*) as count FROM goals'));
  const totalCourses = (await db.get('SELECT COUNT(*) as count FROM courses'));
  const totalPomodoros = (await db.get('SELECT COUNT(*) as count FROM pomodoro_sessions'));
  const pomodoroMinutes = (await db.get('SELECT COALESCE(SUM(duration), 0) as total FROM pomodoro_sessions'));
  const recentUsers = await db.all('SELECT id, name, email, role, verified, created_at FROM users ORDER BY created_at DESC LIMIT 5');
  const moodDistribution = await db.all('SELECT mood, COUNT(*) as count FROM mood_logs GROUP BY mood ORDER BY count DESC');
  const todayUsers = (await db.get("SELECT COUNT(*) as count FROM mood_logs WHERE date = CURRENT_DATE"));
  const taskQuadrants = await db.all('SELECT quadrant, COUNT(*) as count FROM tasks GROUP BY quadrant');
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
    pomodoroMinutes: Number(pomodoroMinutes.total) || 0,
    recentUsers,
    moodDistribution,
    activeToday: todayUsers.count,
    taskQuadrants
  });
});

router.get('/users', async (req, res) => {
  const { search } = req.query;
  let users;
  if (search) {
    users = await db.all("SELECT id, name, email, role, verified, created_at FROM users WHERE name ILIKE $1 OR email ILIKE $1 ORDER BY created_at DESC", [`%${search}%`]);
  } else {
    users = await db.all('SELECT id, name, email, role, verified, created_at FROM users ORDER BY created_at DESC');
  }
  const enriched = [];
  for (const u of users) {
    const taskCount = await db.get('SELECT COUNT(*) as count FROM tasks WHERE user_id = $1', [u.id]);
    const habitCount = await db.get('SELECT COUNT(*) as count FROM habits WHERE user_id = $1', [u.id]);
    const moodCount = await db.get('SELECT COUNT(*) as count FROM mood_logs WHERE user_id = $1', [u.id]);
    enriched.push({ ...u, tasksCount: taskCount.count, habitsCount: habitCount.count, moodsCount: moodCount.count });
  }
  res.json({ users: enriched });
});

router.put('/users/:id/role', async (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  if (req.params.id === req.userId && role !== 'admin') {
    return res.status(400).json({ error: 'Cannot demote yourself' });
  }
  await db.query('UPDATE users SET role = $1 WHERE id = $2', [role, req.params.id]);
  res.json({ message: 'Role updated' });
});

router.put('/users/:id/verify', async (req, res) => {
  const user = await db.get('SELECT verified FROM users WHERE id = $1', [req.params.id]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  await db.query('UPDATE users SET verified = 1, otp = NULL, otp_expires = NULL, otp_attempts = 0 WHERE id = $1', [req.params.id]);
  res.json({ message: 'User verified' });
});

router.delete('/users/:id', async (req, res) => {
  if (req.params.id === req.userId) return res.status(400).json({ error: 'Cannot delete yourself' });
  await db.query('DELETE FROM pomodoro_sessions WHERE user_id = $1', [req.params.id]);
  await db.query('DELETE FROM habit_logs WHERE user_id = $1', [req.params.id]);
  await db.query('DELETE FROM habits WHERE user_id = $1', [req.params.id]);
  await db.query('DELETE FROM journal_entries WHERE user_id = $1', [req.params.id]);
  await db.query('DELETE FROM mood_logs WHERE user_id = $1', [req.params.id]);
  await db.query('DELETE FROM goals WHERE user_id = $1', [req.params.id]);
  await db.query('DELETE FROM courses WHERE user_id = $1', [req.params.id]);
  await db.query('DELETE FROM tasks WHERE user_id = $1', [req.params.id]);
  await db.query('DELETE FROM users WHERE id = $1', [req.params.id]);
  res.json({ message: 'User and all data deleted' });
});

router.get('/tasks', async (req, res) => {
  const { quadrant, completed, search } = req.query;
  let query = 'SELECT t.*, u.name as user_name, u.email as user_email FROM tasks t JOIN users u ON t.user_id = u.id WHERE 1=1';
  const params = [];
  let idx = 1;
  if (quadrant) { query += ` AND t.quadrant = $${idx++}`; params.push(quadrant); }
  if (completed !== undefined) { query += ` AND t.completed = $${idx++}`; params.push(completed === '1' ? 1 : 0); }
  if (search) { query += ` AND (t.title ILIKE $${idx} OR u.name ILIKE $${idx})`; params.push(`%${search}%`); idx++; }
  query += ' ORDER BY t.created_at DESC LIMIT 100';
  const tasks = await db.all(query, params);
  res.json({ tasks });
});

router.get('/analytics', async (req, res) => {
  const dailySignups = await db.all("SELECT created_at::date as date, COUNT(*) as count FROM users GROUP BY created_at::date ORDER BY date DESC LIMIT 30");
  const dailyMoods = await db.all("SELECT date, COUNT(*) as count FROM mood_logs GROUP BY date ORDER BY date DESC LIMIT 30");
  const dailyPomodoros = await db.all("SELECT date, COUNT(*) as sessions, SUM(duration) as minutes FROM pomodoro_sessions GROUP BY date ORDER BY date DESC LIMIT 30");
  const topUsers = await db.all(`
    SELECT u.id, u.name, u.email,
      (SELECT COUNT(*) FROM tasks WHERE user_id = u.id) as tasks,
      (SELECT COUNT(*) FROM habits WHERE user_id = u.id) as habits,
      (SELECT COUNT(*) FROM mood_logs WHERE user_id = u.id) as moods,
      (SELECT COUNT(*) FROM pomodoro_sessions WHERE user_id = u.id) as pomodoros
    FROM users u ORDER BY tasks DESC LIMIT 10
  `);
  const moodDist = await db.all('SELECT mood, COUNT(*) as count FROM mood_logs GROUP BY mood');
  const completionRate = await db.get("SELECT (SELECT COUNT(*) FROM tasks WHERE completed = 1)::float / NULLIF((SELECT COUNT(*) FROM tasks), 0) * 100 as rate");
  res.json({ dailySignups, dailyMoods, dailyPomodoros, topUsers, moodDistribution: moodDist, completionRate: Math.round(completionRate?.rate || 0) });
});

router.get('/activity', async (req, res) => {
  const days = req.query.days ? Math.min(Math.max(parseInt(req.query.days) || 7, 1), 365) : 7;
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const newUsers = await db.all("SELECT 'user' as type, id, name, email, created_at as time FROM users WHERE created_at >= $1 ORDER BY created_at DESC LIMIT 20", [since]);
  const newMoods = await db.all("SELECT 'mood' as type, m.id, u.name, m.mood, m.created_at as time FROM mood_logs m JOIN users u ON m.user_id = u.id WHERE m.created_at >= $1 ORDER BY m.created_at DESC LIMIT 20", [since]);
  const newTasks = await db.all("SELECT 'task' as type, t.id, u.name, t.title, t.created_at as time FROM tasks t JOIN users u ON t.user_id = u.id WHERE t.created_at >= $1 ORDER BY t.created_at DESC LIMIT 20", [since]);
  const newPomodoros = await db.all("SELECT 'pomodoro' as type, p.id, u.name, p.duration, p.created_at as time FROM pomodoro_sessions p JOIN users u ON p.user_id = u.id WHERE p.created_at >= $1 ORDER BY p.created_at DESC LIMIT 20", [since]);

  const allActivity = [...newUsers.map(a => ({ ...a, label: `${a.name} joined` })), ...newMoods.map(a => ({ ...a, label: `${a.name} logged mood: ${a.mood}` })), ...newTasks.map(a => ({ ...a, label: `${a.name} created task: ${a.title}` })), ...newPomodoros.map(a => ({ ...a, label: `${a.name} completed ${a.duration}min pomodoro` }))]
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 50);
  res.json({ activity: allActivity });
});

router.get('/settings', async (req, res) => {
  const settings = await db.get('SELECT name, email, role, created_at FROM users WHERE id = $1', [req.userId]);
  const stats = {
    totalUsers: (await db.get('SELECT COUNT(*) as c FROM users')).c,
    totalTasks: (await db.get('SELECT COUNT(*) as c FROM tasks')).c,
    totalEntries: (await db.get('SELECT COUNT(*) as c FROM journal_entries')).c +
      (await db.get('SELECT COUNT(*) as c FROM mood_logs')).c +
      (await db.get('SELECT COUNT(*) as c FROM habits')).c
  };
  res.json({ admin: settings, dbSize: 0, stats });
});

module.exports = router;
