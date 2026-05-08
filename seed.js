const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { initDB, db } = require('./database');

async function seed() {
  await initDB();

  const email = process.argv[2] || 'admin@hayati.app';
  const password = process.argv[3] || 'admin123';
  const name = process.argv[4] || 'Admin';

  const existing = await db.get('SELECT id FROM users WHERE email = $1', [email]);
  if (existing) {
    await db.query('UPDATE users SET role = $1 WHERE email = $2', ['admin', email]);
    console.log(`User ${email} promoted to admin`);
  } else {
    const hashed = bcrypt.hashSync(password, 10);
    const id = uuidv4();
    await db.query('INSERT INTO users (id, name, email, password, verified, role) VALUES ($1, $2, $3, $4, 1, $5)', [id, name, email, hashed, 'admin']);
    console.log(`Admin user created: ${email} / ${password}`);
  }

  console.log('Done. You can now sign in as admin.');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
