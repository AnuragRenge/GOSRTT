// controllers/vehiclesController.js
const db = require('../db');
Logger = require('../utils/logger');

// GET all vehicles
exports.getVehicles = async (req, res) => {
  Logger.api('Get vehicles requested', {
    userId: req.user?.id,
    ip: req.ip,
    route: req.originalUrl,requestId: req.requestId
  });
  try {
    const [rows] = await db.query('SELECT * FROM vehicles');
    res.json(rows);
  } catch (err) {
    Logger.error('Failed to fetch vehicles', {
      error: err.message,
      stack: err.stack,requestId: req.requestId
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};
// GET vehicle picklist
exports.getVehiclePicklist = async (req, res) => {
  Logger.api('Get vehicle picklist requested', {
    userId: req.user?.id,
    ip: req.ip,
    route: req.originalUrl,requestId: req.requestId
  });
  try {
    const [rows] = await db.query
    ('SELECT v.name , v.id,v.company,v.available_status, v.assigned_driver_id, assigned.name AS driver_name, assigned.email AS driver_email, assigned.status AS driver_status, assigned.phone AS driver_phone, v.owner_driver_id, owner.name AS owner_name, owner.email AS owner_email, owner.status AS owner_status, owner.phone AS owner_phone FROM vehicles v LEFT JOIN drivers assigned ON v.assigned_driver_id = assigned.id LEFT JOIN drivers owner ON v.owner_driver_id = owner.id');
    res.json(rows);
  } catch (err) {
    Logger.error('Failed to fetch vehicle picklist', {
      error: err.message,
      stack: err.stack,requestId: req.requestId
    });
    res.status(500).json({ error: 'Internal server error' });
  }
}   
  // GET one vehicle by id
exports.getVehicleById = async (req, res) => {
  Logger.api('Get vehicle by ID requested', {
    vehicleId: req.params.id,
    userId: req.user?.id,requestId: req.requestId
  });
  try {
    const [rows] = await db.query('SELECT * FROM vehicles WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      Logger.warn('Vehicle not found', { vehicleId: req.params.id,requestId: req.requestId }); 
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    Logger.error('Failed to fetch vehicle by ID', {
      vehicleId: req.params.id,
      error: err.message,
      stack: err.stack,requestId: req.requestId
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST new vehicle
exports.createVehicle = async (req, res) => {
  Logger.api('Create vehicle requested', {
    userId: req.user?.id,
    ip: req.ip,requestId: req.requestId
  });
  const {
    company_id, registration_number, make,
    owner_driver_id, assigned_driver_id, capacity, available_status,name,company
  } = req.body;
  // Check if vehicle with same registration number already exists
  const [existingVehicle] = await db.query(
    'SELECT id FROM vehicles WHERE registration_number = ?',
    [registration_number]
  );
  if (existingVehicle.length > 0) {
    Logger.warn('Vehicle creation failed - duplicate registration number', {
      registration_number,requestId: req.requestId
    });
    return res.status(409).json({ error: 'Vehicle with this registration number already exists' ,requestId: req.requestId});
  } 
  try {
    const [result] = await db.query(
      'INSERT INTO vehicles (company_id, registration_number, make, owner_driver_id, assigned_driver_id, capacity, available_status,name,company) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ? )',
      [company_id, registration_number, make, owner_driver_id, assigned_driver_id, capacity, available_status, name ,company]
    );
    res.status(201).json({ id: result.insertId,requestId: req.requestId });
  } catch (err) {
    Logger.error('Vehicle creation failed', {
      error: err.message,requestId: req.requestId,
      stack: err.stack
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT update vehicle
exports.updateVehicle = async (req, res) => {
  Logger.api('Update vehicle requested', {
    vehicleId: req.params.id,
    userId: req.user?.id,requestId: req.requestId
  });
  const fields = [];
  const values = [];

  [
    'company_id', 'registration_number', 'make', 'owner_driver_id',
    'assigned_driver_id', 'capacity', 'available_status','name', 'company'
  ].forEach(field => {
    if (req.body[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(req.body[field]);
    }
  });

  if (fields.length === 0) {
    Logger.warn('No valid fields provided for vehicle update', { vehicleId: req.params.id,requestId: req.requestId });
    return res.status(400).json({ error: 'No valid fields provided for update' });
  }
  values.push(req.params.id);

  try {
    const sql = `UPDATE vehicles SET ${fields.join(', ')} WHERE id = ?`;
    await db.query(sql, values);
    res.json({ message: 'Vehicle details updated successfully' });
  } catch (err) {
    Logger.error('Vehicle update failed', {
      vehicleId: req.params.id,
      error: err.message,
      stack: err.stack,requestId: req.requestId
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE vehicle
exports.deleteVehicle = async (req, res) => {
  Logger.api('Delete vehicle requested', {
    vehicleId: req.params.id,
    userId: req.user?.id, ip: req.ip,requestId: req.requestId
  });
  try {
    await db.query('DELETE FROM vehicles WHERE id = ?', [req.params.id]);
    res.json({ message: 'Vehicle deleted' });
  } catch (err) {
    Logger.error('Vehicle deletion failed', {
      vehicleId: req.params.id,
      error: err.message,
      stack: err.stack,requestId: req.requestId
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};
