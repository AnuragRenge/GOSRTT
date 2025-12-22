// controllers/companiesController.js
const db = require('../db');
const Logger = require('../utils/logger');

/* =========================================================
   GET COMPANIES PICKLIST
========================================================= */
exports.getCompanyPicklist = async (req, res) => {
  Logger.api('Get company picklist requested', {
    userId: req.user?.id,
    ip: req.ip,requestId: req.requestId
  });
  try {
    const [rows] = await db.query('SELECT id,name FROM companies');
    Logger.info('Company picklist fetched', {
      count: rows.length,requestId: req.requestId
    });
    res.json(rows);
  } catch (err) {
    Logger.error('Failed to fetch company picklist', {
      error: err.message,
      stack: err.stack,requestId: req.requestId
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

/* =========================================================
   GET ALL COMPANIES
========================================================= */
exports.getCompanies = async (req, res) => {
  Logger.api('Get companies requested', {
    userId: req.user?.id,
    ip: req.ip,requestId: req.requestId
  });
  try {
    const [rows] = await db.query('SELECT * FROM companies');
    Logger.info('Companies fetched', {
      count: rows.length,requestId: req.requestId
    });
    res.json(rows);
  } catch (err) {
    Logger.error('Failed to fetch companies', {
      error: err.message,
      stack: err.stack,requestId: req.requestId
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};


/* =========================================================
   GET COMPANY BY ID
========================================================= */
exports.getCompanyById = async (req, res) => {
  Logger.api('Get company by ID requested', {
    companyId,
    userId: req.user?.id,requestId: req.requestId
  });
  try {
    const [rows] = await db.query('SELECT * FROM companies WHERE id = ?', [req.params.id]);
    if (!rows.length) {
      Logger.warn('Company not found', { companyId,requestId: req.requestId });
      return res.status(404).json({ message: 'Company not found' });
    }
    Logger.info('Company fetched', { companyId,requestId: req.requestId });
    res.json(rows[0]);
  } catch (err) {
    Logger.error('Failed to fetch company by ID', {
      companyId,
      error: err.message,
      stack: err.stack,requestId: req.requestId
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

/* =========================================================
   CREATE COMPANY
========================================================= */
exports.createCompany = async (req, res) => {
  Logger.api('Create company requested', {
    userId: req.user?.id,
    ip: req.ip,requestId: req.requestId
  });
  const { name, address, phone, email, localcharge, outstationcharge, lumpsumcharge, localdist, outstationdistance } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO companies (name, address, phone, email, localcharge, outstationcharge, lumpsumcharge, localdist, outstationdistance) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, address, phone, email, localcharge, outstationcharge, lumpsumcharge, localdist, outstationdistance]
    );
    Logger.info('Company created successfully', {
      companyId: result.insertId,
      createdBy: req.user?.id,requestId: req.requestId
    });

    res.status(201).json({ id: result.insertId });
  } catch (err) {
    Logger.error('Create company failed', {
      error: err.message,
      stack: err.stack,requestId: req.requestId
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

/* =========================================================
   UPDATE COMPANY
========================================================= */
exports.updateCompany = async (req, res) => {
  const companyId = req.params.id;

  Logger.api('Update company requested', {
    companyId,
    userId: req.user?.id,requestId: req.requestId
  });
  const fields = [];
  const values = [];

  if (req.body.name !== undefined) { fields.push('name = ?'); values.push(req.body.name); }
  if (req.body.phone !== undefined) { fields.push('phone = ?'); values.push(req.body.phone); }
  if (req.body.address !== undefined) { fields.push('address = ?'); values.push(req.body.address); }
  if (req.body.email !== undefined) { fields.push('email = ?'); values.push(req.body.email); }
  if (req.body.localcharge !== undefined) { fields.push('localcharge = ?'); values.push(req.body.localcharge); }
  if (req.body.outstationcharge !== undefined) { fields.push('outstationcharge = ?'); values.push(req.body.outstationcharge); }
  if (req.body.lumpsumcharge !== undefined) { fields.push('lumpsumcharge = ?'); values.push(req.body.lumpsumcharge); }
  if (req.body.localdist !== undefined) { fields.push('localdist = ?'); values.push(req.body.localdist); }
  if (req.body.outstationdistance !== undefined) { fields.push('outstationdistance = ?'); values.push(req.body.outstationdistance); }

  if (fields.length === 0) {
    Logger.warn('No valid fields provided for company update', { companyId,requestId: req.requestId });
    return res.status(400).json({ error: 'No valid fields provided for update' });
  }

  values.push(req.params.id);

  try {
    const sql = `UPDATE companies SET ${fields.join(', ')} WHERE id = ?`;
    await db.query(sql, values);
    Logger.info('Company updated successfully', {
      companyId,
      updatedBy: req.user?.id,
      fieldCount: fields.length,requestId: req.requestId
    });
    res.json({ message: 'Company updated successfully' });
  } catch (err) {
    Logger.error('Update company failed', {
      companyId,
      error: err.message,
      stack: err.stack,requestId: req.requestId
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

/* =========================================================
   DELETE COMPANY
========================================================= */
exports.deleteCompany = async (req, res) => {
  Logger.api('Delete company requested', {
    companyId,
    userId: req.user?.id,requestId: req.requestId
  });
  try {
    await db.query('DELETE FROM companies WHERE id = ?', [req.params.id]);
    Logger.info('Company deleted successfully', {
      companyId,
      deletedBy: req.user?.id,requestId: req.requestId
    });
    res.json({ message: 'Company deleted' });
  } catch (err) {
    Logger.error('Delete company failed', {
      companyId,
      error: err.message,
      stack: err.stack,requestId: req.requestId
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};
