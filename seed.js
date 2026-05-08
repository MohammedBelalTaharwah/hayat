const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { initDB, getDB } = require('./database');

initDB();
const db = getDB();

const email = process.argv[2] || 'admin@hayati.app';
const password = process.argv[3] || 'admin123';
const name = process.argv[4] || 'Admin';

const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
if (existing) {
  db.prepare('UPDATE users SET role = ? WHERE email = ?').run('admin', email);
  console.log(`User ${email} promoted to admin`);
} else {
  const hashed = bcrypt.hashSync(password, 10);
  const id = uuidv4();
  db.prepare('INSERT INTO users (id, name, email, password, verified, role) VALUES (?, ?, ?, ?, 1, ?)').run(id, name, email, hashed, 'admin');
  console.log(`Admin user created: ${email} / ${password}`);
}

console.log('Done. You can now sign in as admin.');
process.exit(0);
