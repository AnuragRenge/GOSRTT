// controllers/usersController.js
const db = require('../db');

// GET all users
exports.getUsers = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM users');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET all users with paginaion
// GET all users with pagination and field selection
exports.getUserspage = async (req, res) => {
  const page = parseInt(req.query.page) || 1;     // Default to page 1
  const limit = parseInt(req.query.limit) || 15;  // Default 20 records per page
  const offset = (page - 1) * limit;

  try {
    const start = Date.now(); // Log start time

    // Only select necessary fields (avoid SELECT *)
    const [rows] = await db.query(
      'SELECT id, username, email, role, mobile, is_active, updated_at,last_login,created_at FROM users LIMIT ? OFFSET ?',
      [limit, offset]
    );

    const end = Date.now(); // Log end time
    console.log(`Query time: ${end - start}ms`);

    res.json({
      page,
      limit,
      data: rows
    });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: err.message });
  }
};



// GET user by ID
exports.getUserById = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST new user
exports.createUser = async (req, res) => {
  const { username, email, password, role, mobile } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO users (username, email, password, role, mobile,updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [username, email, password, role, mobile, new Date()]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT update user
exports.updateUser = async (req, res) => {
  const { username, email, password, role, mobile,is_active } = req.body;
  const fields = [];
  const values = [];

  if (username !== undefined) { fields.push('username = ?'); values.push(username); }
  if (email !== undefined)    { fields.push('email = ?');    values.push(email); }
  if (password !== undefined) { fields.push('password = ?'); values.push(password); }
  if (role !== undefined)     { fields.push('role = ?');     values.push(role); }
  if (mobile !== undefined)   { fields.push('mobile = ?');   values.push(mobile); }
  if (is_active !== undefined)   { fields.push('is_active = ?');   values.push(is_active); }

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
    res.status(500).json({ error: err.message });
  }
};

// DELETE user
exports.deleteUser = async (req, res) => {
  try {
    await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
