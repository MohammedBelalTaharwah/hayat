const express = require('express');
const { getDB } = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/stats', authenticate, (req, res) => {
  const db = getDB();
  const userId = req.userId;

  const tasksCompleted = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND completed = 1').get(userId);
  const totalTasks = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE user_id = ?').get(userId);

  const goalsProgress = db.prepare('SELECT COALESCE(AVG(progress), 0) as avg FROM goals WHERE user_id = ?').get(userId);

  const studyHours = db.prepare('SELECT COALESCE(SUM(completed_hours), 0) as total FROM courses WHERE user_id = ?').get(userId);

  const habitStreaks = db.prepare('SELECT streak FROM habits WHERE user_id = ? ORDER BY streak DESC LIMIT 1').get(userId);

  const todayMood = db.prepare('SELECT * FROM mood_logs WHERE user_id = ? AND date = date(\'now\') ORDER BY created_at DESC LIMIT 1').get(userId);

  const recentMoods = db.prepare('SELECT mood, date FROM mood_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 7').all(userId);

  const habits = db.prepare('SELECT * FROM habits WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  const habitsWithLogs = habits.map(h => {
    const logs = db.prepare('SELECT * FROM habit_logs WHERE habit_id = ? AND user_id = ? ORDER BY date DESC LIMIT 7').all(h.id, userId);
    return { ...h, logs };
  });

  res.json({
    tasksCompleted: tasksCompleted.count,
    totalTasks: totalTasks.count,
    goalsProgress: Math.round(goalsProgress.avg),
    studyHours: studyHours.total,
    streakDays: habitStreaks?.streak || 0,
    todayMood,
    recentMoods,
    habits: habitsWithLogs
  });
});

module.exports = router;
