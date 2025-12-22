// controllers/driversController.js
const db = require('../db');
const Logger = require('../utils/logger');

/* =========================================================
   GET ALL DRIVERS
========================================================= */
exports.getDrivers = async (req, res) => {
  Logger.api('Get drivers requested', {
    userId: req.user?.id,
    ip: req.ip,requestId: req.requestId
  });
  try {
    const [rows] = await db.query('SELECT * FROM drivers');
    Logger.info('Drivers fetched successfully', {
      count: rows.length,requestId: req.requestId
    });
    res.json(rows);
  } catch (err) {
    Logger.error('Failed to fetch drivers', {
      error: err.message,
      stack: err.stack,requestId: req.requestId
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};
/* =========================================================
   GET DRIVERS PICKLIST
========================================================= */
exports.getDriversPicklist = async (req, res) => {
  Logger.api('Get drivers picklist requested', {
    userId: req.user?.id,
    ip: req.ip,requestId: req.requestId
  });
  try {
    const [rows] = await db.query('SELECT id,name,status FROM drivers');
    Logger.info('Drivers picklist fetched', {
      count: rows.length,requestId: req.requestId
    });
    res.json(rows);
  } catch (err) {
    Logger.error('Failed to fetch drivers picklist', {
      error: err.message,
      stack: err.stack,requestId: req.requestId
    });

    res.status(500).json({ error: 'Internal server error' });
  }
};

/* =========================================================
   GET DRIVER BY ID
========================================================= */
exports.getDriverById = async (req, res) => {
  const driverId = req.params.id;

  Logger.api('Get driver by ID requested', {
    driverId,
    userId: req.user?.id,requestId: req.requestId
  });
  try {
    const [rows] = await db.query('SELECT * FROM drivers WHERE id = ?', [driverId]);
    if (!rows.length) {
      Logger.warn('Driver not found', { driverId,requestId: req.requestId });
      return res.status(404).json({ message: 'Driver not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    Logger.error('Failed to fetch driver by ID', {
      driverId,
      error: err.message,
      stack: err.stack,requestId: req.requestId
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

/* =========================================================
   CREATE DRIVER
========================================================= */
exports.createDriver = async (req, res) => {
  Logger.api('Create driver requested', {
    userId: req.user?.id,
    ip: req.ip,requestId: req.requestId
  });
  const { name, license_number, phone, aadhar_card, status, email, company_id } = req.body;
  const [existingDriver] = await db.query(
    'SELECT id FROM drivers WHERE phone = ?',
    [phone]
  );
  if (existingDriver.length > 0) {
    Logger.warn('Duplicate driver creation attempt', {
      phoneLast4: phone?.slice(-4),requestId: req.requestId
    });
    return res.status(409).json({ error: 'Driver with this phone number already exists' });
  }
  try {
    const [result] = await db.query(
      'INSERT INTO drivers (name, license_number, phone, aadhar_card, status, email, company_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, license_number, phone, aadhar_card, status, email, company_id]
    );
    Logger.info('Driver created successfully', {
      driverId: result.insertId,
      createdBy: req.user?.id,requestId: req.requestId
    });
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    Logger.error('Create driver failed', {
      error: err.message,
      stack: err.stack,requestId: req.requestId
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

/* =========================================================
   UPDATE DRIVER
========================================================= */
exports.updateDriver = async (req, res) => {
  const driverId = req.params.id;

  Logger.api('Update driver requested', {
    driverId,
    userId: req.user?.id,requestId: req.requestId
  });
  const fields = [];
  const values = [];
  if (req.body.name !== undefined) { fields.push('name = ?'); values.push(req.body.name); }
  if (req.body.phone !== undefined) { fields.push('phone = ?'); values.push(req.body.phone); }
  if (req.body.email !== undefined) { fields.push('email = ?'); values.push(req.body.email); }
  if (req.body.license_number !== undefined) { fields.push('license_number = ?'); values.push(req.body.license_number); }
  if (req.body.status !== undefined) { fields.push('status = ?'); values.push(req.body.status); }
  if (req.body.aadhar_card !== undefined) { fields.push('aadhar_card = ?'); values.push(req.body.aadhar_card); }
  if (req.body.company_id !== undefined) { fields.push('company_id = ?'); values.push(req.body.company_id); }

  if (fields.length === 0) {
    Logger.warn('No valid fields provided for driver update', { driverId ,requestId: req.requestId});
    return res.status(400).json({ error: 'No valid fields provided for update' });
  }
  values.push(req.params.id);

  try {
    const sql = `UPDATE drivers SET ${fields.join(', ')} WHERE id = ?`;
    await db.query(sql, values);
    Logger.info('Driver updated successfully', {
      driverId,
      updatedBy: req.user?.id,
      fieldCount: fields.length,requestId: req.requestId
    });
    res.json({ message: 'Driver details updated successfully' });
  } catch (err) {
    Logger.error('Update driver failed', {
      driverId,
      error: err.message,
      stack: err.stack,requestId: req.requestId
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

/* =========================================================
   DELETE DRIVER
========================================================= */
exports.deleteDriver = async (req, res) => {
  const driverId = req.params.id;

  Logger.api('Delete driver requested', {
    driverId,
    userId: req.user?.id,requestId: req.requestId
  });
  try {
    await db.query('DELETE FROM drivers WHERE id = ?', [req.params.id]);
    Logger.info('Driver deleted successfully', {
      driverId,
      deletedBy: req.user?.id,requestId: req.requestId
    });
    res.json({ message: 'Driver deleted' });
  } catch (err) {
    Logger.error('Delete driver failed', {
      driverId,
      error: err.message,
      stack: err.stack,requestId: req.requestId
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};
