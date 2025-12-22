// controllers/usersController.js
const db = require('../db');
const Logger = require('../utils/logger');

// GET all users
exports.getUsers = async (req, res) => {
  Logger.api('Get users requested', {
    userId: req.user?.id,
    ip: req.ip,
    route: req.originalUrl,requestId: req.requestId
  });
  try {
    const [rows] = await db.query('SELECT * FROM users');
    Logger.info('Users fetched successfully', {
      count: rows.length,requestId: req.requestId
    });

    res.json(rows);
  } catch (err) {
    Logger.error('Failed to fetch users', {
      error: err.message,
      stack: err.stack,requestId: req.requestId
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET all users with paginaion
// GET all users with pagination and field selection
exports.getUserspage = async (req, res) => {
  const page = parseInt(req.query.page) || 1;     // Default to page 1
  const limit = parseInt(req.query.limit) || 15;  // Default 20 records per page
  const offset = (page - 1) * limit;

  Logger.api('Get users (paginated) requested', {
    userId: req.user?.id,
    page,
    limit,requestId: req.requestId
  });


  try {
    const start = Date.now(); // Log start time

    // Only select necessary fields (avoid SELECT *)
    const [rows] = await db.query(
      'SELECT id, username, email, role, mobile, is_active, updated_at,last_login,created_at FROM users LIMIT ? OFFSET ?',
      [limit, offset]
    );

    const end = Date.now(); // Log end time
    const durationMs = end - start;
    Logger.info('Users fetched with pagination', {
      page,
      limit,
      count: rows.length,
      queryTimeMs: durationMs,
      requestId: req.requestId
    });

    res.json({
      page,
      limit,
      data: rows
    });
  } catch (err) {
    Logger.error('Failed to fetch paginated users', {
      error: err.message,
      stack: err.stack,requestId: req.requestId
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};



// GET user by ID
exports.getUserById = async (req, res) => {
  const userId = req.params.id;

  Logger.api('Get user by ID requested', {
    userId,
    requestedBy: req.user?.id,requestId: req.requestId
  });

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!rows.length) {
      Logger.warn('User not found', { userId,requestId: req.requestId });
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    Logger.error('Failed to fetch user by ID', {
      userId,
      error: err.message,
      stack: err.stack,requestId: req.requestId
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST new user
exports.createUser = async (req, res) => {
  Logger.api('Create user requested', {
    requestedBy: req.user?.id,
    ip: req.ip,requestId: req.requestId
  });
  const { username, email, password, role, mobile } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO users (username, email, password, role, mobile,updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [username, email, password, role, mobile, new Date()]
    );
    Logger.info('User created successfully', {
      userId: result.insertId,
      createdBy: req.user?.id,requestId: req.requestId
    });
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    Logger.error('User creation failed', {
      error: err.message,
      stack: err.stack,requestId: req.requestId
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT update user
exports.updateUser = async (req, res) => {
  Logger.api('Update user requested', {
    userId: req.params.id,
    requestedBy: req.user?.id,
    ip: req.ip,requestId: req.requestId
  });
  const { username, email, password, role, mobile, is_active } = req.body;
  const fields = [];
  const values = [];

  if (username !== undefined) { fields.push('username = ?'); values.push(username); }
  if (email !== undefined) { fields.push('email = ?'); values.push(email); }
  if (password !== undefined) { fields.push('password = ?'); values.push(password); }
  if (role !== undefined) { fields.push('role = ?'); values.push(role); }
  if (mobile !== undefined) { fields.push('mobile = ?'); values.push(mobile); }
  if (is_active !== undefined) { fields.push('is_active = ?'); values.push(is_active); }

  if (fields.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  fields.push('updated_at = ?');
  values.push(new Date());

  const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
  values.push(req.params.id);

  try {
    await db.query(sql, values);
    res.json({ message: 'User updated successfully' });
  } catch (err) {
    Logger.error('User update failed', {
      userId: req.params.id,
      error: err.message,
      stack: err.stack,requestId: req.requestId
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE user
exports.deleteUser = async (req, res) => {
  const userId = req.params.id;
  Logger.api('Delete user requested', {
    userId,
    requestedBy: req.user?.id,
    ip: req.ip,requestId: req.requestId
  });
  try {
    await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    Logger.error('User deletion failed', {
      userId,
      error: err.message,
      stack: err.stack,requestId: req.requestId
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};
