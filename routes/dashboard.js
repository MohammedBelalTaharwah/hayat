const express = require('express');
const { db } = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/stats', authenticate, async (req, res) => {
  const userId = req.userId;

  const tasksCompleted = await db.get('SELECT COUNT(*) as count FROM tasks WHERE user_id = $1 AND completed = 1', [userId]);
  const totalTasks = await db.get('SELECT COUNT(*) as count FROM tasks WHERE user_id = $1', [userId]);

  const goalsProgress = await db.get('SELECT COALESCE(AVG(progress), 0) as avg FROM goals WHERE user_id = $1', [userId]);

  const studyHours = await db.get('SELECT COALESCE(SUM(completed_hours), 0) as total FROM courses WHERE user_id = $1', [userId]);

  const habitStreaks = await db.get('SELECT streak FROM habits WHERE user_id = $1 ORDER BY streak DESC LIMIT 1', [userId]);

  const todayMood = await db.get("SELECT * FROM mood_logs WHERE user_id = $1 AND date = CURRENT_DATE ORDER BY created_at DESC LIMIT 1", [userId]);

  const recentMoods = await db.all('SELECT mood, date FROM mood_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 7', [userId]);

  const habits = await db.all('SELECT * FROM habits WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
  const habitsWithLogs = [];
  for (const h of habits) {
    const logs = await db.all('SELECT * FROM habit_logs WHERE habit_id = $1 AND user_id = $2 ORDER BY date DESC LIMIT 7', [h.id, userId]);
    habitsWithLogs.push({ ...h, logs });
  }

  res.json({
    tasksCompleted: tasksCompleted.count,
    totalTasks: totalTasks.count,
    goalsProgress: Math.round(Number(goalsProgress.avg)),
    studyHours: Number(studyHours.total),
    streakDays: habitStreaks?.streak || 0,
    todayMood,
    recentMoods,
    habits: habitsWithLogs
  });
});

module.exports = router;
