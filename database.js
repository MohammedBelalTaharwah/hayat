const Database = require('better-sqlite3');
const path = require('path');

let db;

function initDB() {
  db = new Database(path.join(__dirname, 'hayati.db'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      verified INTEGER DEFAULT 0,
      role TEXT DEFAULT 'user',
      otp TEXT,
      otp_expires TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    try { db.exec("ALTER TABLE users ADD COLUMN otp_attempts INTEGER DEFAULT 0"); } catch {}

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      quadrant TEXT CHECK(quadrant IN ('urgent_important','not_urgent_important','urgent_not_important','not_urgent_not_important')),
      due_date TEXT,
      due_time TEXT,
      priority TEXT DEFAULT 'medium',
      completed INTEGER DEFAULT 0,
      assigned_to TEXT,
      mode TEXT DEFAULT 'eisenhower',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      icon TEXT DEFAULT 'self_improvement',
      color TEXT DEFAULT 'primary',
      streak INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS habit_logs (
      id TEXT PRIMARY KEY,
      habit_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      FOREIGN KEY (habit_id) REFERENCES habits(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT,
      content TEXT,
      mood_tag TEXT,
      image_url TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS mood_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      mood TEXT NOT NULL,
      notes TEXT,
      date TEXT DEFAULT (date('now')),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      target_date TEXT,
      progress INTEGER DEFAULT 0,
      category TEXT DEFAULT 'personal',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      provider TEXT,
      url TEXT,
      total_hours REAL DEFAULT 0,
      completed_hours REAL DEFAULT 0,
      status TEXT DEFAULT 'in_progress',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS pomodoro_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      duration INTEGER NOT NULL,
      type TEXT DEFAULT 'focus',
      task_id TEXT,
      notes TEXT,
      date TEXT DEFAULT (date('now')),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
}

function getDB() {
  if (!db) initDB();
  return db;
}

module.exports = { initDB, getDB };
