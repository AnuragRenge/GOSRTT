const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Logger = require('../utils/logger');
const { sendEmail } = require('../controllers/emailHelper');

require('dotenv').config();

/**
 * REGISTER
 */
exports.register = async (req, res) => {
  const { username, email, password, role, mobile } = req.body;

  Logger.api('Register API called', { email, mobile, ip: req.ip,requestId: req.requestId });

  try {
    // Check existing user
    const [existing] = await db.query(
      'SELECT id FROM users WHERE email = ? OR mobile = ?',
      [email, mobile]
    );

    if (existing.length > 0) {
      Logger.warn('User already exists', { email, mobile, ip: req.ip,requestId: req.requestId });
      return res.status(409).json({
        message: 'User already exists with same email or mobile'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      `INSERT INTO users 
       (username, email, password, role, mobile, is_active, updated_at) 
       VALUES (?, ?, ?, ?, ?, 1, ?)`,
      [username, email, hashedPassword, role || 'user', mobile, new Date()]
    );

    Logger.info('User registered successfully', {requestId: req.requestId,
      userId: result.insertId,
      role: role || 'user'
    });

    res.status(201).json({
      id: result.insertId,
      message: 'User registered successfully'
    });

  } catch (err) {
    Logger.error('User registration failed', {requestId: req.requestId,
      message: err.message,
      stack: err.stack
    });

    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * LOGIN
 */
exports.login = async (req, res) => {
  const { email, password } = req.body;

  Logger.api('Login API called', { email, ip: req.ip, requestId: req.requestId });

  try {
    const [users] = await db.query(
      'SELECT * FROM users WHERE email = ? AND is_active = 1',
      [email]
    );

    if (!users.length) {
      Logger.security('Invalid login - user not found', {
        email,
        ip: req.ip, requestId: req.requestId
      });
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = users[0];

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      Logger.security('Invalid login - wrong password', {
        email,
        ip: req.ip, requestId: req.requestId
      });
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    await db.query(
      'UPDATE users SET last_login = ? WHERE id = ?',
      [new Date(), user.id]
    );

    Logger.info('User logged in successfully', {
      userId: user.id,
      role: user.role, requestId: req.requestId
    });

    res.json({
      message: 'Login successful',
      token,
      id: user.id,
      username: user.username,
      email: user.email,
      mobile: user.mobile,
      role: user.role
    });

  } catch (err) {
    Logger.error('Login failed', {
      message: err.message,
      stack: err.stack, requestId: req.requestId
    });

    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  Logger.api('Forgot password requested', { email, ip: req.ip, requestId: req.requestId });

  try {
    const [users] = await db.query(
      'SELECT id,username FROM users WHERE email = ? AND is_active = 1',
      [email]
    );

    // Always return same message (security)
    if (!users.length) {
      Logger.debug('Forgot password requested for non-existent email', { email, ip: req.ip, requestId: req.requestId });
      return res.json({
        message: 'If the email exists, password reset instructions will be sent over the email'
      });
    }
    Logger.debug('Forgot password requested for valid user', { userId: users[0].id, ip: req.ip, requestId: req.requestId });

    const user = users[0];

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    await db.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES (?, ?, ?)`,
      [user.id, resetToken, expiresAt]
    );

    Logger.info('Password reset token generated', { userId: user.id, requestId: req.requestId ,ip: req.ip});

    const resetLink = `https://gosrtt.com/reset-password.html?token=${encodeURIComponent(resetToken)}`;

    const html = `
      <p>Dear ${user.username},</p>
      <p>You requested a password reset.</p>
      <p>
        <a href="${resetLink}">Click here to reset your password</a>
      </p>
      <p>This link is valid for <b>15 minutes</b>.</p>
      <p>If you didn’t request this, please ignore this email.</p>
      <br/>
      <p>— Sai Ram Tours & Travels</p>
    `;
    const text = `Reset your password using this link: ${resetLink}`;

    Logger.debug('Sending password reset email', { email, ip: req.ip, requestId: req.requestId });

    await sendEmail(
      email,
      'Reset your password: Sai Ram Tours & Travels',
      html,
      text
    );

    Logger.info('Password reset email sent', { userId: user.id, requestId: req.requestId ,ip: req.ip});

    res.json({
      message: 'If the email exists, password reset instructions will be sent over the email',
    });

  } catch (err) {
    Logger.error('Forgot password failed', { message: err.message, requestId: req.requestId, stack: err.stack });
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  Logger.api('Reset password attempt', { ip: req.ip, requestId: req.requestId });

  try {
    const [rows] = await db.query(
      `SELECT * FROM password_reset_tokens
       WHERE token = ? AND used = 0 AND expires_at > NOW()`,
      [token]
    );

    if (!rows.length) {
      Logger.security('Invalid or expired reset token', { ip: req.ip, requestId: req.requestId });
      return res.status(400).json({ message: 'Reset link has been expired or is invalid. Kindly reinitate the process.' });
    }

    const resetRecord = rows[0];
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.query(
      'UPDATE users SET password = ?, updated_at = ? WHERE id = ?',
      [hashedPassword, new Date(), resetRecord.user_id]
    );

    await db.query(
      'UPDATE password_reset_tokens SET used = 1 WHERE id = ?',
      [resetRecord.id]
    );

    Logger.info('Password reset successful', {
      userId: resetRecord.user_id, ip: req.ip, requestId: req.requestId
    });

    res.json({ message: 'Password reset successful' });

  } catch (err) {
    Logger.error('Reset password failed', { message: err.message, stack: err.stack, requestId: req.requestId });
    res.status(500).json({ message: 'Internal server error' });
  }
};


