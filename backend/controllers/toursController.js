// controllers/toursController.js
const db = require('../db');

// GET all tours
exports.getTours = async (req, res) => {
  Logger.api('Get tours requested', {
    userId: req.user?.id,
    ip: req.ip,
    route: req.originalUrl,requestId: req.requestId
  });
  try {
    const [rows] = await db.query(`SELECT t.id,t.name AS tour_name,l.name AS lead_name,
      t.type_of_tour AS tour_type,t.created_at,
      l.phone AS lead_phone,l.email AS lead_email FROM tours t
      LEFT JOIN leads l  on t.lead_id = l.id`);
    Logger.info('Tours fetched successfully', {
      count: rows.length,requestId: req.requestId
    });
    res.json(rows);
  } catch (err) {
    Logger.error('Failed to fetch tours', {
      error: err.message,
      stack: err.stack,requestId: req.requestId
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET one tour by id 
exports.getTourById = async (req, res) => {
  Logger.api('Get tour by ID requested', {
    tourId: req.params.id,
    userId: req.user?.id,
    ip: req.ip,requestId: req.requestId
  });
  try {
    const [rows] = await db.query(`SELECT tours.*,l.name AS lead_name,
    l.phone AS lead_phone,l.email AS lead_email,v.assigned_driver_id as assigned_driver FROM tours 
    LEFT JOIN leads l on tours.lead_id = l.id
    LEFT JOIN vehicles v ON tours.vehicle_id = v.id      
    WHERE tours.id = ?`, [req.params.id]);
    if (!rows.length) {
      Logger.warn('Tour not found', { tourId,requestId: req.requestId });
      return res.status(404).json({ message: 'Tour not found' });
    }
    Logger.info('Tour fetched successfully', { tourId,requestId: req.requestId });
    res.json(rows[0]);
  } catch (err) {
    Logger.error('Failed to fetch tour by ID', {
      tourId: req.params.id,
      error: err.message,
      stack: err.stack,requestId: req.requestId
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST new tour
exports.createTour = async (req, res) => {
  Logger.api('Create tour requested', {
    userId: req.user?.id,
    ip: req.ip,requestId: req.requestId
  });
  // Allowed fields
  const allowedFields = [
    'company_id', 'lead_id', 'vehicle_id',
    'description', 'start_state', 'end_state', 'start_city', 'end_city',
    'pickup_location', 'drop_location', 'start_date', 'end_date',
    'duration_days', 'distance_km', 'type_of_tour', 'premium'
  ];//'driver_id',

  const fields = [];
  const values = [];

  // Pick only non-undefined allowed fields from req.body
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      fields.push(field);
      values.push(req.body[field]);
    }
  });

  let driverIdToSet = null;
  if ('vehicle_id' in req.body) {
    try {
      const [rows] = await db.query(
        'SELECT assigned_driver_id FROM vehicles WHERE id = ?',
        [req.body.vehicle_id]
      );
      driverIdToSet = rows.length > 0 ? rows[0].assigned_driver_id : null;
    } catch (err) {
      Logger.error('Error fetching assigned driver', {
        error: err.message,
        stack: err.stack,requestId: req.requestId
      });
      return res.status(500).json({ error: 'Error fetching assigned driver: ' + err.message });
    }
    // Overwrite/update driver_id regardless of user input
    fields.push('driver_id');
    values.push(driverIdToSet);
  }

  let price = 0;
  try {
    const { type_of_tour, company_id } = req.body;
    if (type_of_tour && company_id) {
      let priceField = null;
      if (type_of_tour === 'Local') priceField = 'localcharge';
      else if (type_of_tour === 'Outstation') priceField = 'outstationcharge';
      else if (type_of_tour === 'Lumpsum') priceField = 'lumpsumcharge';

      let query = ``;
      if (priceField) {
        query = `SELECT ${priceField} AS price FROM companies WHERE id = ?`;
        const [rows] = await db.query(query, [company_id]);
        if (rows.length > 0) {
          price = Number(rows[0].price) || 0;
        }
      }
    }
  } catch (err) {
    Logger.error('Error fetching company price', {
      error: err.message,
      stack: err.stack,requestId: req.requestId
    });
    return res.status(500).json({ error: 'Error fetching company price: ' + err.message });
  }

  fields.push('price');
  values.push(price);


  // Calculate total_amount if distance_km, price, premium are present (either required or optional)
  let total_amount;
  const hasDist = fields.includes('distance_km');
  const hasPremium = fields.includes('premium');

  if (hasDist && hasPremium) {
    const distance = Number(req.body.distance_km);
    const premium = Number(req.body.premium);
    total_amount = ((distance) * 2) * price + premium;
  }

  // Don't let users provide their own total_amount
  fields.push('total_amount');
  values.push(total_amount);

  // Construct dynamic query 
  const fieldList = fields.join(', ');
  const placeholders = fields.map(() => '?').join(', ');

  try {
    const [result] = await db.query(`INSERT INTO tours (${fieldList}) VALUES (${placeholders})`,
      values
    );
    const insertedId = result.insertId;

    const formattedName = `B NO -${String(insertedId).padStart(4, '0')}`;

    db.query('UPDATE bookings SET name = ? WHERE id = ?', [formattedName, insertedId]);
    Logger.info('Tour created successfully', {
      tourId: insertedId,
      tourname: formattedName,
      createdBy: req.user?.id,requestId: req.requestId
    });

    res.status(201).json({ id: result.insertId });
  } catch (err) {
    Logger.error('Create tour failed', {
      error: err.message,
      stack: err.stack,requestId: req.requestId
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};


// PUT update tour
exports.updateTour = async (req, res) => {
  const tourId = req.params.id;

  Logger.api('Update tour requested', {
    tourId,
    userId: req.user?.id,requestId: req.requestId
  });

  const updatableFields = [
    'company_id', 'lead_id', 'vehicle_id', 'driver_id',
    'description', 'start_state', 'end_state', 'start_city', 'end_city',
    'pickup_location', 'drop_location', 'start_date', 'end_date',
    'duration_days', 'distance_km', 'type_of_tour', 'premium'
  ];

  const fields = [];
  const values = [];

  updatableFields.forEach(field => {
    if (req.body[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(req.body[field]);
    }
  });

  if (fields.length === 0) {
    Logger.warn('No valid fields provided for tour update', { tourId,requestId: req.requestId });
    return res.status(400).json({ error: 'No valid fields provided for update' });
  }

  let driverIdToSet = null;
  if ('vehicle_id' in req.body) {
    try {
      const [rows] = await db.query(
        'SELECT assigned_driver_id FROM vehicles WHERE id = ?',
        [req.body.vehicle_id]
      );
      driverIdToSet = rows.length > 0 ? rows[0].assigned_driver_id : null;
    } catch (err) {
      Logger.error('Error fetching assigned driver', {
        error: err.message,
        stack: err.stack,requestId: req.requestId
      });
      return res.status(500).json({ error: 'Error fetching assigned driver: ' + err.message });
    }
    // Overwrite/update driver_id regardless of user input
    fields.push('driver_id = ?');
    values.push(driverIdToSet);
  }

  // Determine if price or total_amount should be recalculated
  const updatePrice = 'company_id' in req.body || 'type_of_tour' in req.body;
  const recalcTotal = updatePrice || 'distance_km' in req.body || 'price' in req.body || 'premium' in req.body;

  // 1. Query only needed fields
  let neededFields = [];

  if (recalcTotal) {
    if (updatePrice) {
      // if recalculating price, need type_of_tour and company_id
      if (!('type_of_tour' in req.body)) neededFields.push('type_of_tour');
      if (!('company_id' in req.body)) neededFields.push('company_id');
    }
    // For total_amount, need distance_km, premium, price (price will be from db or recalculated or user-provided)
    if (!('distance_km' in req.body)) neededFields.push('distance_km');
    if (!('premium' in req.body)) neededFields.push('premium');
    if (!updatePrice && !('price' in req.body)) neededFields.push('price'); // Don't fetch price if recalculating
  }

  let tourData = {};
  if (neededFields.length > 0) {
    try {
      const [rows] = await db.query(
        `SELECT ${neededFields.join(', ')} FROM tours WHERE id = ?`,
        [req.params.id]
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Tour not found' });
      tourData = rows[0];
    } catch (err) {
      Logger.error('Error fetching tour data for recalculation', {
        tourId,
        error: err.message,
        stack: err.stack,requestId: req.requestId
      });
      return res.status(500).json({ error: err.message });
    }
  }

  // 2. Recalculate price if necessary
  let newPrice = null;
  if (updatePrice) {
    const type_of_tour = req.body.type_of_tour !== undefined ? req.body.type_of_tour : tourData.type_of_tour;
    const company_id = req.body.company_id !== undefined ? req.body.company_id : tourData.company_id;
    if (type_of_tour && company_id) {
      let priceField = null;
      if (type_of_tour === 'Local') priceField = 'localcharge';
      else if (type_of_tour === 'Outstation') priceField = 'outstationcharge';
      else if (type_of_tour === 'Lumpsum') priceField = 'lumpsumcharge';
      if (priceField) {
        try {
          const [rows] = await db.query(
            `SELECT ${priceField} AS price FROM companies WHERE id = ?`,
            [company_id]
          );
          newPrice = rows.length > 0 ? Number(rows[0].price) || 0 : 0;
          Logger.info('Recalculated price for tour update', { tourId, newPrice,requestId: req.requestId });
        } catch (err) {
          Logger.error('Error fetching company price', {
            error: err.message,
            stack: err.stack,requestId: req.requestId
          });
          return res.status(500).json({ error: 'Error fetching company price: ' + err.message });
        }
      } else {
        newPrice = 0;
      }
    }
    fields.push('price = ?');
    values.push(newPrice);
  }

  // 3. Recalculate total_amount if any dependent changed
  if (recalcTotal) {
    const distance = Number(req.body.distance_km !== undefined ? req.body.distance_km : tourData.distance_km);
    const premium = Number(req.body.premium !== undefined ? req.body.premium : tourData.premium);
    const priceToUse = newPrice !== null ? newPrice : (req.body.price !== undefined ? Number(req.body.price) : (tourData.price !== undefined ? Number(tourData.price) : 0));
    const total_amount = ((distance) * 2) * priceToUse + premium;
    fields.push('total_amount = ?');
    values.push(total_amount);
  }

  values.push(req.params.id);

  try {
    const sql = `UPDATE tours SET ${fields.join(', ')} WHERE id = ?`;
    await db.query(sql, values);
    Logger.info('Tour updated successfully', {
      tourId,
      updatedBy: req.user?.id,
      fieldCount: fields.length,requestId: req.requestId
    });
    res.json({ message: 'Tour details updated successfully' });
  } catch (err) {
    Logger.error('Update tour failed', {
      tourId,
      error: err.message,
      stack: err.stack,requestId: req.requestId
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE tour
exports.deleteTour = async (req, res) => {
  const tourId = req.params.id;
  Logger.api('Delete tour requested', {
    tourId,
    userId: req.user?.id,
    ip: req.ip,requestId: req.requestId
  });
  try {
    await db.query('DELETE FROM tours WHERE id = ?', [req.params.id]);
    Logger.info('Tour deleted successfully', {
      tourId,
      deletedBy: req.user?.id,requestId: req.requestId
    });
    res.json({ message: 'Tour deleted' });
  } catch (err) {
    Logger.error('Delete tour failed', {
      tourId,
      error: err.message,
      stack: err.stack,requestId: req.requestId
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};
