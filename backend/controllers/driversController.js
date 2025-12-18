// controllers/driversController.js
const db = require('../db');

// GET all drivers
exports.getDrivers = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM drivers');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// GET all drivers for picklist
exports.getDriversPicklist = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id,name,status FROM drivers');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET one driver by id
exports.getDriverById = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM drivers WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Driver not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST new driver
exports.createDriver = async (req, res) => {
  const { name, license_number, phone, aadhar_card, status, email, company_id } = req.body;
  const [existingDriver] = await db.query(
        'SELECT id FROM drivers WHERE phone = ?',
        [phone]
      );
      if (existingDriver.length > 0) {
        return res.status(409).json({ error: 'Driver with this phone number already exists' });
      }
  try {
    const [result] = await db.query(
      'INSERT INTO drivers (name, license_number, phone, aadhar_card, status, email, company_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, license_number, phone, aadhar_card, status, email, company_id]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT update driver
exports.updateDriver = async (req, res) => {
  const fields = [];
  const values = [];
  if (req.body.name !== undefined)           { fields.push('name = ?');           values.push(req.body.name); }
  if (req.body.phone !== undefined)          { fields.push('phone = ?');          values.push(req.body.phone); }
  if (req.body.email !== undefined)          { fields.push('email = ?');          values.push(req.body.email); }
  if (req.body.license_number !== undefined) { fields.push('license_number = ?'); values.push(req.body.license_number); }
  if (req.body.status !== undefined)         { fields.push('status = ?');         values.push(req.body.status); }
  if (req.body.aadhar_card !== undefined)    { fields.push('aadhar_card = ?');    values.push(req.body.aadhar_card); }
  if (req.body.company_id !== undefined)     { fields.push('company_id = ?');     values.push(req.body.company_id); }

  if (fields.length === 0) {
    return res.status(400).json({ error: 'No valid fields provided for update' });
  }
  values.push(req.params.id);

  try {
    const sql = `UPDATE drivers SET ${fields.join(', ')} WHERE id = ?`;
    await db.query(sql, values);
    res.json({ message: 'Driver details updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE driver
exports.deleteDriver = async (req, res) => {
  try {
    await db.query('DELETE FROM drivers WHERE id = ?', [req.params.id]);
    res.json({ message: 'Driver deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
