const { Pool } = require('pg');

let pool;

function getPool() {
  if (!pool) {
    const isServerless = !!process.env.VERCEL;
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/hayati',
      max: isServerless ? 1 : 10,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
  }
  return pool;
}

const db = {
  query: async (text, params) => {
    const p = getPool();
    return p.query(text, params);
  },
  get: async (text, params) => {
    const p = getPool();
    const result = await p.query(text, params);
    return result.rows[0] || null;
  },
  all: async (text, params) => {
    const p = getPool();
    const result = await p.query(text, params);
    return result.rows;
  }
};

async function initDB() {
  const p = getPool();
  await p.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      verified SMALLINT DEFAULT 0,
      role TEXT DEFAULT 'user',
      otp TEXT,
      otp_expires TIMESTAMP,
      otp_attempts SMALLINT DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      description TEXT,
      quadrant TEXT CHECK(quadrant IN ('urgent_important','not_urgent_important','urgent_not_important','not_urgent_not_important')),
      due_date TEXT,
      due_time TEXT,
      priority TEXT DEFAULT 'medium',
      completed SMALLINT DEFAULT 0,
      assigned_to TEXT,
      mode TEXT DEFAULT 'eisenhower',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      icon TEXT DEFAULT 'self_improvement',
      color TEXT DEFAULT 'primary',
      streak INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS habit_logs (
      id TEXT PRIMARY KEY,
      habit_id TEXT NOT NULL REFERENCES habits(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      date DATE NOT NULL,
      completed SMALLINT DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      title TEXT,
      content TEXT,
      mood_tag TEXT,
      image_url TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS mood_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      mood TEXT NOT NULL,
      notes TEXT,
      date DATE DEFAULT CURRENT_DATE,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      description TEXT,
      target_date TEXT,
      progress INTEGER DEFAULT 0,
      category TEXT DEFAULT 'personal',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      provider TEXT,
      url TEXT,
      total_hours REAL DEFAULT 0,
      completed_hours REAL DEFAULT 0,
      status TEXT DEFAULT 'in_progress',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS pomodoro_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      duration INTEGER NOT NULL,
      type TEXT DEFAULT 'focus',
      task_id TEXT,
      notes TEXT,
      date DATE DEFAULT CURRENT_DATE,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  console.log('Database tables initialized');
}

module.exports = { initDB, db };
