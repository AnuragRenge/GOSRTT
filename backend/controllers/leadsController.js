const db = require('../db');
const { sendEmail } = require('./emailHelper');
const leadCreatedTemplate = require('../templates/leadCreated');
const enquiryCreatedTemplate = require('../templates/enquiryCreated');
const Logger = require('../utils/logger');

/* =========================================================
   GET ALL LEADS
========================================================= */
exports.getLeads = async (req, res) => {
  Logger.api('Get leads requested', {
    userId: req.user?.id,
    ip: req.ip,requestId: req.requestId
  });

  try {
    const [rows] = await db.query('SELECT * FROM leads');
    Logger.info('Leads fetched successfully', {
      count: rows.length,requestId: req.requestId
    });
    res.json(rows);
  } catch (err) {
    Logger.error('Failed to fetch leads', {
      error: err.message,
      stack: err.stack,requestId: req.requestId
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

/* =========================================================
   GET LEAD PICKLIST
========================================================= */
exports.getLeadPicklist = async (req, res) => {
  Logger.api('Get lead picklist requested', {
    userId: req.user?.id,
    ip: req.ip,requestId: req.requestId
  });

  try {
    const [rows] = await db.query('SELECT id, name FROM leads');

    Logger.info('Lead picklist fetched', {
      count: rows.length,requestId: req.requestId
    });

    res.json(rows);
  } catch (err) {
    Logger.error('Failed to fetch lead picklist', {
      error: err.message,
      stack: err.stack,requestId: req.requestId
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};


/* =========================================================
   GET LEAD BY ID
========================================================= */
exports.getLeadById = async (req, res) => {
  const leadId = req.params.id;

  Logger.api('Get lead by ID requested', {
    leadId,
    userId: req.user?.id,requestId: req.requestId
  });

  try {
    const [rows] = await db.query(
      'SELECT * FROM leads WHERE id = ?',
      [leadId]
    );

    if (!rows.length) {
      Logger.warn('Lead not found', { leadId,requestId: req.requestId });
      return res.status(404).json({ message: 'Lead not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    Logger.error('Failed to fetch lead by ID', {
      leadId,
      error: err.message,
      stack: err.stack,requestId: req.requestId
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};


/* =========================================================
   CREATE LEAD
========================================================= */
exports.createLead = async (req, res) => {
  Logger.api('Create lead requested', {
    userId: req.user?.id,
    ip: req.ip,requestId: req.requestId
  });

  const { name, phone, email, source, status } = req.body;

  try {
    const [existingLeads] = await db.query(
      'SELECT id FROM leads WHERE phone = ?',
      [phone]
    );

    if (existingLeads.length > 0) {
      Logger.warn('Duplicate lead creation attempt', {
        phoneLast4: phone?.slice(-4),requestId: req.requestId
      });
      return res.status(409).json({
        error: 'Lead with this phone number already exists'
      });
    }

    const [result] = await db.query(
      'INSERT INTO leads (name, phone, email, source, status) VALUES (?, ?, ?, ?, ?)',
      [name, phone, email, source, status]
    );

    const leadId = result.insertId;

    Logger.info('Lead created successfully', {
      leadId,
      createdBy: req.user?.id,requestId: req.requestId
    });

    /* ---------- Async Email Notifications ---------- */
    setImmediate(() => {
      sendEmail(
        email,
        'Thank you for your interest',
        leadCreatedTemplate(name),
        `Hello ${name}, Thank you for showing interest.`
      ).catch(err => {
        Logger.error('Customer lead email failed', {
          leadId,
          error: err.message,requestId: req.requestId
        });
      });

      sendEmail(
        'contact.gosrtt@gmail.com',
        'New Enquiry/Lead has been created',
        enquiryCreatedTemplate({ name, phone, email, source }),
        'New lead created'
      ).catch(err => {
        Logger.error('Admin lead email failed', {
          leadId,
          error: err.message,requestId: req.requestId
        });
      });
    });

    res.status(201).json({ id: leadId });

  } catch (err) {
    Logger.error('Create lead failed', {
      error: err.message,
      stack: err.stack,requestId: req.requestId
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

/* =========================================================
   UPDATE LEAD
========================================================= */
exports.updateLead = async (req, res) => {
  const leadId = req.params.id;

  Logger.api('Update lead requested', {
    leadId,
    userId: req.user?.id,requestId: req.requestId
  });

  const fields = [];
  const values = [];

  if (req.body.name !== undefined) { fields.push('name = ?'); values.push(req.body.name); }
  if (req.body.phone !== undefined) { fields.push('phone = ?'); values.push(req.body.phone); }
  if (req.body.email !== undefined) { fields.push('email = ?'); values.push(req.body.email); }
  if (req.body.source !== undefined) { fields.push('source = ?'); values.push(req.body.source); }
  if (req.body.status !== undefined) { fields.push('status = ?'); values.push(req.body.status); }

  if (!fields.length) {
    Logger.warn('No valid fields provided for lead update', { leadId,requestId: req.requestId });
    return res.status(400).json({ error: 'No valid fields provided for update' });
  }

  values.push(leadId);

  try {
    const sql = `UPDATE leads SET ${fields.join(', ')} WHERE id = ?`;
    await db.query(sql, values);

    Logger.info('Lead updated successfully', {
      leadId,
      updatedBy: req.user?.id,
      fieldCount: fields.length,requestId: req.requestId
    });

    res.json({ message: 'Lead updated successfully' });
  } catch (err) {
    Logger.error('Update lead failed', {
      leadId,
      error: err.message,
      stack: err.stack,requestId: req.requestId
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

/* =========================================================
   DELETE LEAD
========================================================= */
exports.deleteLead = async (req, res) => {
  const leadId = req.params.id;

  Logger.api('Delete lead requested', {
    leadId,
    userId: req.user?.id,requestId: req.requestId
  });

  try {
    await db.query('DELETE FROM leads WHERE id = ?', [leadId]);

    Logger.info('Lead deleted successfully', {
      leadId,
      deletedBy: req.user?.id,requestId: req.requestId,requestId: req.requestId
    });

    res.json({ message: 'Lead deleted' });
  } catch (err) {
    Logger.error('Delete lead failed', {
      leadId,
      error: err.message,
      stack: err.stack,requestId: req.requestId
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};