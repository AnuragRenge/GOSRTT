// controllers/companiesController.js
const db = require('../db');

// GET all companies for picklist
exports.getCompanyPicklist = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id,name FROM companies');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// GET all companies
exports.getCompanies = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM companies');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET company by ID
exports.getCompanyById = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM companies WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Company not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST new company
exports.createCompany = async (req, res) => {
  const { name, address, phone, email, localcharge, outstationcharge, lumpsumcharge, localdist, outstationdistance } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO companies (name, address, phone, email, localcharge, outstationcharge, lumpsumcharge, localdist, outstationdistance) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, address, phone, email, localcharge, outstationcharge, lumpsumcharge, localdist, outstationdistance]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT update company
exports.updateCompany = async (req, res) => {
  const fields = [];
  const values = [];

  if (req.body.name !== undefined)           { fields.push('name = ?'); values.push(req.body.name); }
  if (req.body.phone !== undefined)          { fields.push('phone = ?'); values.push(req.body.phone); }
  if (req.body.address !== undefined)          { fields.push('address = ?'); values.push(req.body.address); } 
  if (req.body.email !== undefined)          { fields.push('email = ?'); values.push(req.body.email); }
  if (req.body.localcharge !== undefined)    { fields.push('localcharge = ?'); values.push(req.body.localcharge); }
  if (req.body.outstationcharge !== undefined){ fields.push('outstationcharge = ?'); values.push(req.body.outstationcharge); }
  if (req.body.lumpsumcharge !== undefined)  { fields.push('lumpsumcharge = ?'); values.push(req.body.lumpsumcharge); }
  if (req.body.localdist !== undefined)      { fields.push('localdist = ?'); values.push(req.body.localdist); }
  if (req.body.outstationdistance !== undefined) { fields.push('outstationdistance = ?'); values.push(req.body.outstationdistance); }

  if (fields.length === 0) {
    return res.status(400).json({ error: 'No valid fields provided for update' });
  }

  values.push(req.params.id);

  try {
    const sql = `UPDATE companies SET ${fields.join(', ')} WHERE id = ?`;
    await db.query(sql, values);
    res.json({ message: 'Company updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE company
exports.deleteCompany = async (req, res) => {
  try {
    await db.query('DELETE FROM companies WHERE id = ?', [req.params.id]);
    res.json({ message: 'Company deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
