const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const validator = require('validator');
const { getDB } = require('../database');
const { authenticate, generateToken, generateRefreshToken, verifyRefreshToken, TOKEN_COOKIE_OPTS } = require('../middleware/auth');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false
});

function sanitize(str) {
  if (typeof str !== 'string') return '';
  return validator.stripLow(str).trim();
}

function validateEmail(email) {
  return email && validator.isEmail(email) && email.length <= 254;
}

function validatePassword(password) {
  return password && password.length >= 8 && password.length <= 128;
}

function validateName(name) {
  return name && typeof name === 'string' && name.length >= 1 && name.length <= 100;
}

function setTokenCookies(res, token, refreshToken) {
  res.cookie('token', token, TOKEN_COOKIE_OPTS);
  if (refreshToken) {
    res.cookie('refreshToken', refreshToken, TOKEN_COOKIE_OPTS);
  }
}

function requireVerified(req, res, next) {
  const db = getDB();
  const user = db.prepare('SELECT verified FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (!user.verified) return res.status(403).json({ error: 'Email not verified. Please verify your email first.' });
  next();
}

router.post('/signup', authLimiter, (req, res) => {
  let { name, email, password } = req.body;
  name = sanitize(name);
  email = sanitize(email);

  if (!validateName(name) || !validateEmail(email) || !validatePassword(password)) {
    return res.status(400).json({
      error: 'Invalid input. Name (1-100 chars), valid email, and password (8-128 chars) required.'
    });
  }

  const db = getDB();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const hashed = bcrypt.hashSync(password, 10);
  const id = uuidv4();
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO users (id, name, email, password, otp, otp_expires) VALUES (?, ?, ?, ?, ?, ?)').run(id, name, email, hashed, otp, otpExpires);
  console.log(`[DEV] OTP for ${email}: ${otp}`);
  const token = generateToken(id);
  const refreshToken = generateRefreshToken(id);
  setTokenCookies(res, token, refreshToken);

  const devOtp = process.env.NODE_ENV !== 'production' ? { devOtp: otp } : {};
  res.json({ token, user: { id, name, email, role: 'user' }, message: 'Account created. Please verify your email.', ...devOtp });
});

router.post('/verify-otp', authenticate, otpLimiter, (req, res) => {
  const { otp } = req.body;
  if (!otp || typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
    return res.status(400).json({ error: 'Valid 6-digit OTP required' });
  }
  const db = getDB();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.verified) return res.json({ message: 'Already verified' });

  const attempts = db.prepare("SELECT COUNT(*) as count FROM users WHERE id = ? AND otp_attempts >= 3").get(req.userId);
  if (attempts?.count > 0) {
    return res.status(429).json({ error: 'Too many attempts. Request a new OTP.' });
  }

  if (user.otp !== otp || new Date(user.otp_expires) < new Date()) {
    db.prepare('UPDATE users SET otp_attempts = COALESCE(otp_attempts, 0) + 1 WHERE id = ?').run(req.userId);
    return res.status(400).json({ error: 'Invalid or expired OTP' });
  }

  db.prepare('UPDATE users SET verified = 1, otp = NULL, otp_expires = NULL, otp_attempts = NULL WHERE id = ?').run(req.userId);
  res.json({ message: 'Email verified successfully' });
});

router.post('/resend-otp', authenticate, otpLimiter, (req, res) => {
  const db = getDB();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.verified) return res.json({ message: 'Already verified' });
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  db.prepare('UPDATE users SET otp = ?, otp_expires = ?, otp_attempts = 0 WHERE id = ?').run(otp, otpExpires, req.userId);
  console.log(`[DEV] New OTP for ${user.email}: ${otp}`);
  res.json({ message: 'OTP resent' });
});

router.post('/login', authLimiter, (req, res) => {
  const { email, password } = req.body;
  if (!validateEmail(email) || !password) {
    return res.status(400).json({ error: 'Valid email and password required' });
  }
  const db = getDB();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = generateToken(user.id);
  const refreshToken = generateRefreshToken(user.id);
  setTokenCookies(res, token, refreshToken);

  res.json({ token, user: { id: user.id, name: user.name, email: user.email, verified: user.verified, role: user.role || 'user' } });
});

router.post('/forgot-password', otpLimiter, (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const db = getDB();
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (user) {
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    db.prepare('UPDATE users SET otp = ?, otp_expires = ?, otp_attempts = 0 WHERE id = ?').run(otp, otpExpires, user.id);
    console.log(`[DEV] Password reset OTP for ${email}: ${otp}`);
  }

  res.json({ message: 'If the email exists, a reset link has been sent (check console in dev mode)' });
});

router.post('/reset-password', otpLimiter, (req, res) => {
  const { email, otp, password } = req.body;
  if (!validateEmail(email) || !otp || !validatePassword(password)) {
    return res.status(400).json({ error: 'Valid email, 6-digit OTP, and password (8-128 chars) required' });
  }
  const db = getDB();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || user.otp !== otp || new Date(user.otp_expires) < new Date()) {
    return res.status(400).json({ error: 'Invalid or expired OTP' });
  }
  const hashed = bcrypt.hashSync(password, 10);
  db.prepare('UPDATE users SET password = ?, otp = NULL, otp_expires = NULL WHERE id = ?').run(hashed, user.id);
  res.json({ message: 'Password reset successfully' });
});

router.post('/refresh', (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
  if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' });

  const userId = verifyRefreshToken(refreshToken);
  if (!userId) return res.status(401).json({ error: 'Invalid or expired refresh token' });

  const db = getDB();
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(401).json({ error: 'User not found' });

  const newToken = generateToken(userId);
  const newRefreshToken = generateRefreshToken(userId);
  setTokenCookies(res, newToken, newRefreshToken);

  res.json({ token: newToken, message: 'Token refreshed' });
});

router.get('/me', authenticate, (req, res) => {
  const db = getDB();
  const user = db.prepare('SELECT id, name, email, verified, role, created_at FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

router.get('/check-admin', authenticate, (req, res) => {
  const db = getDB();
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.userId);
  res.json({ isAdmin: user?.role === 'admin' });
});

router.delete('/account', authenticate, (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM pomodoro_sessions WHERE user_id = ?').run(req.userId);
  db.prepare('DELETE FROM habit_logs WHERE user_id = ?').run(req.userId);
  db.prepare('DELETE FROM habits WHERE user_id = ?').run(req.userId);
  db.prepare('DELETE FROM journal_entries WHERE user_id = ?').run(req.userId);
  db.prepare('DELETE FROM mood_logs WHERE user_id = ?').run(req.userId);
  db.prepare('DELETE FROM goals WHERE user_id = ?').run(req.userId);
  db.prepare('DELETE FROM courses WHERE user_id = ?').run(req.userId);
  db.prepare('DELETE FROM tasks WHERE user_id = ?').run(req.userId);
  db.prepare('DELETE FROM users WHERE id = ?').run(req.userId);
  res.json({ message: 'Account and all data deleted permanently' });
});

module.exports = router;
