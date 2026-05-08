const { db } = require('../database');

async function requireAdmin(req, res, next) {
  const user = await db.get('SELECT role FROM users WHERE id = $1', [req.userId]);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = { requireAdmin };
