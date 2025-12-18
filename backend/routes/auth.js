const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Register
router.post('/register', async (req, res) => {
  const { username, email, password, role,mobile } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [existingUsers] = await db.query('SELECT * FROM users WHERE email = ? OR mobile = ?',[email, mobile] );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        error: 'User already exists with the same email or mobile number.'
      });
    }
    const [result] = await db.query(
      'INSERT INTO users (username, email, password, role,mobile, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [username, email, hashedPassword, role, mobile || 'user',new Date()]
    );
    res.status(201).json({ id: result.insertId, message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [users] = await db.query('SELECT * FROM users WHERE email = ? AND is_active = 1', [email]);
    const user = users[0];
    const [userss] = await db.query('SELECT * FROM users WHERE is_active = 1');
    const activeuser = userss[0];

    if(!activeuser) return res.status(401).json({message: 'User is not active in system'})

    if (!user) return res.status(401).json({ message: 'Invalid email or password' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid email or password' });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Capture current datetime
    const now = new Date();
    await db.query('UPDATE users SET last_login = ? WHERE id = ?', [now, user.id]);

    res.json({ message: 'Login successful', token,username: user.username, email: user.email,
      mobile: user.mobile, id: user.id, role: user.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
