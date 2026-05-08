const nodemailer = require('nodemailer');

let transporter = null;

function initMail() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    return true;
  }
  return false;
}

async function sendOTP(email, otp) {
  if (!transporter && !initMail()) {
    console.log(`[DEV] OTP for ${email}: ${otp}`);
    return false;
  }
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  try {
    await transporter.sendMail({
      from: `"Hayati" <${from}>`,
      to: email,
      subject: 'Your Hayati Verification Code',
      text: `Your verification code is: ${otp}\n\nThis code expires in 10 minutes.`,
      html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#f7f9fb;border-radius:12px"><div style="text-align:center;margin-bottom:24px"><h1 style="color:#4648d4;font-size:24px">Hayati | حياتي</h1></div><div style="background:white;padding:24px;border-radius:12px;text-align:center"><h2 style="color:#191c1e;font-size:18px;margin-bottom:16px">Your Verification Code</h2><div style="background:#eef2ff;padding:16px;border-radius:8px;font-size:32px;letter-spacing:8px;font-weight:bold;color:#4648d4;margin-bottom:16px">${otp}</div><p style="color:#565e74;font-size:14px">This code expires in 10 minutes.</p></div></div>`
    });
    return true;
  } catch (err) {
    console.error(`[EMAIL FAILED] ${err.message}`);
    console.log(`[DEV FALLBACK] OTP for ${email}: ${otp}`);
    return false;
  }
}

async function sendPasswordReset(email, otp) {
  if (!transporter && !initMail()) {
    console.log(`[DEV] Password reset OTP for ${email}: ${otp}`);
    return false;
  }
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  try {
    await transporter.sendMail({
      from: `"Hayati" <${from}>`,
      to: email,
      subject: 'Hayati Password Reset Code',
      text: `Your password reset code is: ${otp}\n\nThis code expires in 10 minutes.`,
      html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#f7f9fb;border-radius:12px"><div style="text-align:center;margin-bottom:24px"><h1 style="color:#4648d4;font-size:24px">Hayati | حياتي</h1></div><div style="background:white;padding:24px;border-radius:12px;text-align:center"><h2 style="color:#191c1e;font-size:18px;margin-bottom:16px">Password Reset Code</h2><div style="background:#eef2ff;padding:16px;border-radius:8px;font-size:32px;letter-spacing:8px;font-weight:bold;color:#4648d4;margin-bottom:16px">${otp}</div><p style="color:#565e74;font-size:14px">This code expires in 10 minutes.</p></div></div>`
    });
    return true;
  } catch (err) {
    console.error(`[EMAIL FAILED] ${err.message}`);
    console.log(`[DEV FALLBACK] Password reset OTP for ${email}: ${otp}`);
    return false;
  }
}

module.exports = { sendOTP, sendPasswordReset };
