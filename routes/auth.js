const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const validator = require('validator');
const { db } = require('../database');
const { authenticate, generateToken, generateRefreshToken, verifyRefreshToken, TOKEN_COOKIE_OPTS } = require('../middleware/auth');
const { sendOTP, sendPasswordReset } = require('../email');

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
  (async () => {
    const user = await db.get('SELECT verified FROM users WHERE id = $1', [req.userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.verified) return res.status(403).json({ error: 'Email not verified. Please verify your email first.' });
    next();
  })();
}

router.post('/signup', authLimiter, async (req, res) => {
  let { name, email, password } = req.body;
  name = sanitize(name);
  email = sanitize(email);

  if (!validateName(name) || !validateEmail(email) || !validatePassword(password)) {
    return res.status(400).json({
      error: 'Invalid input. Name (1-100 chars), valid email, and password (8-128 chars) required.'
    });
  }

  const existing = await db.get('SELECT id FROM users WHERE email = $1', [email]);
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const hashed = bcrypt.hashSync(password, 10);
  const id = uuidv4();
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await db.query('INSERT INTO users (id, name, email, password, otp, otp_expires) VALUES ($1, $2, $3, $4, $5, $6)', [id, name, email, hashed, otp, otpExpires]);
  const emailSent = await sendOTP(email, otp);
  const token = generateToken(id);
  const refreshToken = generateRefreshToken(id);
  setTokenCookies(res, token, refreshToken);

  const response = { token, user: { id, name, email, role: 'user' }, message: 'Account created. Please verify your email.' };
  if (!emailSent) response.devOtp = otp;
  res.json(response);
});

router.post('/verify-otp', authenticate, otpLimiter, async (req, res) => {
  const { otp } = req.body;
  if (!otp || typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
    return res.status(400).json({ error: 'Valid 6-digit OTP required' });
  }
  const user = await db.get('SELECT * FROM users WHERE id = $1', [req.userId]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.verified) return res.json({ message: 'Already verified' });

  const attempts = await db.get('SELECT otp_attempts FROM users WHERE id = $1', [req.userId]);
  if (attempts && attempts.otp_attempts >= 3) {
    return res.status(429).json({ error: 'Too many attempts. Request a new OTP.' });
  }

  if (user.otp !== otp || new Date(user.otp_expires) < new Date()) {
    await db.query('UPDATE users SET otp_attempts = COALESCE(otp_attempts, 0) + 1 WHERE id = $1', [req.userId]);
    return res.status(400).json({ error: 'Invalid or expired OTP' });
  }

  await db.query('UPDATE users SET verified = 1, otp = NULL, otp_expires = NULL, otp_attempts = 0 WHERE id = $1', [req.userId]);
  res.json({ message: 'Email verified successfully' });
});

router.post('/resend-otp', authenticate, otpLimiter, async (req, res) => {
  const user = await db.get('SELECT * FROM users WHERE id = $1', [req.userId]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.verified) return res.json({ message: 'Already verified' });
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await db.query('UPDATE users SET otp = $1, otp_expires = $2, otp_attempts = 0 WHERE id = $3', [otp, otpExpires, req.userId]);
  const emailSent = await sendOTP(user.email, otp);
  const response = { message: 'OTP resent' };
  if (!emailSent) response.devOtp = otp;
  res.json(response);
});

router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!validateEmail(email) || !password) {
    return res.status(400).json({ error: 'Valid email and password required' });
  }
  const user = await db.get('SELECT * FROM users WHERE email = $1', [email]);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = generateToken(user.id);
  const refreshToken = generateRefreshToken(user.id);
  setTokenCookies(res, token, refreshToken);

  res.json({ token, user: { id: user.id, name: user.name, email: user.email, verified: user.verified, role: user.role || 'user' } });
});

router.post('/forgot-password', otpLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  let devOtp;
  const user = await db.get('SELECT id FROM users WHERE email = $1', [email]);
  if (user) {
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await db.query('UPDATE users SET otp = $1, otp_expires = $2, otp_attempts = 0 WHERE id = $3', [otp, otpExpires, user.id]);
    const emailSent = await sendPasswordReset(email, otp);
    if (!emailSent) devOtp = otp;
  }

  const response = { message: 'If the email exists, a reset link has been sent' };
  if (devOtp) response.devOtp = devOtp;
  res.json(response);
});

router.post('/reset-password', otpLimiter, async (req, res) => {
  const { email, otp, password } = req.body;
  if (!validateEmail(email) || !otp || !validatePassword(password)) {
    return res.status(400).json({ error: 'Valid email, 6-digit OTP, and password (8-128 chars) required' });
  }
  const user = await db.get('SELECT * FROM users WHERE email = $1', [email]);
  if (!user || user.otp !== otp || new Date(user.otp_expires) < new Date()) {
    return res.status(400).json({ error: 'Invalid or expired OTP' });
  }
  const hashed = bcrypt.hashSync(password, 10);
  await db.query('UPDATE users SET password = $1, otp = NULL, otp_expires = NULL WHERE id = $2', [hashed, user.id]);
  res.json({ message: 'Password reset successfully' });
});

router.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
  if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' });

  const userId = verifyRefreshToken(refreshToken);
  if (!userId) return res.status(401).json({ error: 'Invalid or expired refresh token' });

  const user = await db.get('SELECT id FROM users WHERE id = $1', [userId]);
  if (!user) return res.status(401).json({ error: 'User not found' });

  const newToken = generateToken(userId);
  const newRefreshToken = generateRefreshToken(userId);
  setTokenCookies(res, newToken, newRefreshToken);

  res.json({ token: newToken, message: 'Token refreshed' });
});

router.get('/me', authenticate, async (req, res) => {
  const user = await db.get('SELECT id, name, email, verified, role, created_at FROM users WHERE id = $1', [req.userId]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

router.get('/check-admin', authenticate, async (req, res) => {
  const user = await db.get('SELECT role FROM users WHERE id = $1', [req.userId]);
  res.json({ isAdmin: user?.role === 'admin' });
});

router.delete('/account', authenticate, async (req, res) => {
  await db.query('DELETE FROM pomodoro_sessions WHERE user_id = $1', [req.userId]);
  await db.query('DELETE FROM habit_logs WHERE user_id = $1', [req.userId]);
  await db.query('DELETE FROM habits WHERE user_id = $1', [req.userId]);
  await db.query('DELETE FROM journal_entries WHERE user_id = $1', [req.userId]);
  await db.query('DELETE FROM mood_logs WHERE user_id = $1', [req.userId]);
  await db.query('DELETE FROM goals WHERE user_id = $1', [req.userId]);
  await db.query('DELETE FROM courses WHERE user_id = $1', [req.userId]);
  await db.query('DELETE FROM tasks WHERE user_id = $1', [req.userId]);
  await db.query('DELETE FROM users WHERE id = $1', [req.userId]);
  res.json({ message: 'Account and all data deleted permanently' });
});

module.exports = router;
