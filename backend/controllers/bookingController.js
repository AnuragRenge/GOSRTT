// controllers/bookingController.js
const db = require('../db');
const Decimal = require('decimal.js');

// GET all bookings
exports.getBookings = async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT b.id, b.name, b.type_of_tour AS tour_type, b.created_at,
       b.status, l.name AS lead_name, t.name AS tour_name 
      FROM bookings b
      LEFT JOIN leads l ON b.lead_id = l.id 
      LEFT JOIN tours t ON b.tour_id = t.id;`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET booking by ID
exports.getBookingById = async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT bookings.*,
      l.phone AS lead_phone,l.email AS lead_email,t.total_amount AS tour_total_amount
      FROM bookings 
      LEFT JOIN leads l ON bookings.lead_id = l.id
      LEFT JOIN tours t ON bookings.tour_id = t.id
      WHERE bookings.id = ?`, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Booking not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST new booking
exports.createBooking = async (req, res) => {

  // Allowed fields
  const allowedFields = [
    'company_id', 'lead_id', 'vehicle_id', 'tour_id',
    'actual_distance_km', 'amount_paid',
    'actual_duration', 'expenses', 'toll_tax'
  ];//, 'driver_id',status ,'type_of_tour',
  // ,'booking_date', 'booking_end_date', 'booked_distance_km', 'total_amount','duration','outstanding_amount','actual_total_amount', 'profit'

  const fields = [];
  const values = [];

  // Pick only non-undefined allowed fields from req.body
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      fields.push(field);
      values.push(req.body[field]);
    }
  });

  if (fields.length === 0) {
    return res.status(400).json({ error: 'No Fields To Insert' });
  }

  let driverId = null;
  if ('vehicle_id' in req.body) {
    try {
      const [rows] = await db.query(
        'SELECT assigned_driver_id FROM vehicles WHERE id = ?',
        [req.body.vehicle_id]
      );
      driverId = rows.length > 0 ? rows[0].assigned_driver_id : null;
    } catch (err) {
      return res.status(500).json({ error: 'Error fetching assigned driver: ' + err.message });
    }
    fields.push('driver_id');
    values.push(driverId);
  }

  let amount = null;
  if ('tour_id' in req.body) {
    try {
      const [rows] = await db.query(`SELECT start_date,end_date,distance_km,
        total_amount,duration_days,type_of_tour 
        FROM tours WHERE id = ?`, [req.body.tour_id]);
      if (rows.length > 0) {
        fields.push('booking_date');
        values.push(rows[0].start_date);
        fields.push('booking_end_date');
        values.push(rows[0].end_date);
        fields.push('booked_distance_km');
        values.push(rows[0].distance_km);
        fields.push('total_amount');
        values.push(rows[0].total_amount);
        fields.push('actual_total_amount');
        values.push(rows[0].total_amount);
        amount = rows[0].total_amount || 0;
        fields.push('duration');
        values.push(rows[0].duration_days);
        fields.push('type_of_tour');
        values.push(rows[0].type_of_tour);
      }
    } catch (err) {
      return res.status(500).json({ error: 'Error fetching tour details: ' + err.message });
    }
  }

  fields.push('status');
  values.push('In Process');


  if ('amount_paid' in req.body && req.body.amount_paid !== undefined) {
    const outstandingamt = new Decimal(amount).minus(new Decimal(req.body.amount_paid));
    fields.push('outstanding_amount');
    values.push(outstandingamt.toNumber());
  } else {
    fields.push('outstanding_amount');
    values.push(amount.toNumber());
  }


  if (('expenses' in req.body && req.body.expenses !== undefined) || ('toll_tax' in req.body && req.body.toll_tax !== undefined)) {
    const profit = Decimal(amount).minus(
      Decimal(req.body.expenses || 0).plus(Decimal(req.body.toll_tax || 0))
    );
    fields.push('profit');
    values.push(profit.toNumber());
  }

  // Construct dynamic query 
  const fieldList = fields.join(', ');
  const placeholders = fields.map(() => '?').join(', ');

  try {
    const [result] = await db.query(`INSERT INTO bookings (${fieldList}) VALUES (${placeholders})`,
      values
    );
    const insertedId = result.insertId;
    const formattedName = `B NO -${String(insertedId).padStart(4, '0')}`;
    await db.query('UPDATE bookings SET name = ? WHERE id = ?', [formattedName, insertedId]);

    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};

// PUT update booking
exports.updateBooking = async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({ error: 'Booking ID is required' });
    }
    //console.log('request Body:', req.body);

    // ------- Fetch existing booking & company charges ------
    const [rows] = await db.query(
      `SELECT 
        b.id, b.actual_total_amount, b.booked_distance_km, b.type_of_tour,b.total_amount,
        b.expenses, b.toll_tax, b.profit, b.amount_paid, b.outstanding_amount,
        b.actual_distance_km,b.vehicle_id, b.driver_id, b.status,
        c.localcharge, c.outstationcharge, c.lumpsumcharge,
        v.assigned_driver_id as vehicle_assigned_driver_id
       FROM bookings b
       LEFT JOIN companies c ON b.company_id = c.id
       LEFT JOIN vehicles v ON b.vehicle_id = v.id
       WHERE b.id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const prior = rows[0];

    // ------- Decide per/km charge price based on existing tour type -------
    let price = null;
    if (prior.type_of_tour === 'Local') price = prior.localcharge;
    else if (prior.type_of_tour === 'Outstation') price = prior.outstationcharge;
    else if (prior.type_of_tour === 'Lumpsum') price = prior.lumpsumcharge;

    let fields = [];
    let values = [];

    // ------- Condition 1: Vehicle change -> auto update driver -------
    if ('vehicle_id' in req.body) {
      let driverId = null;
      try {
        const [vehicleRows] = await db.query(
          'SELECT assigned_driver_id FROM vehicles WHERE id = ?',
          [req.body.vehicle_id]
        );
        driverId = vehicleRows.length > 0 ? vehicleRows.assigned_driver_id : null;
      } catch (err) {
        console.error('Error fetching assigned driver:', err);
        return res.status(500).json({ error: 'Error fetching driver details' });
      }

      fields.push("vehicle_id = ?", "driver_id = ?");
      values.push(req.body.vehicle_id, driverId);
    }

    // Condition 2: Prevent manual type_of_tour update
    if ('type_of_tour' in req.body) {
      delete req.body.type_of_tour;
    }

    // Use current amount as base
    let newActualTotal =null;

    // ------- Condition 3: Recalculate actual_total_amount on distance change -------
    if ('actual_distance_km' in req.body) {
      const newDist = new Decimal(req.body.actual_distance_km);

      if (newDist.greaterThan(prior.booked_distance_km || 0) && price != null) {

        const extraKm = newDist.minus(prior.booked_distance_km || 0);;
        newActualTotal = new Decimal(prior.total_amount).plus(extraKm.times(price));

        fields.push("actual_total_amount = ?");
        values.push(newActualTotal.toNumber());

        let amountpaid = new Decimal(prior.amount_paid || 0);
        let outstandingAmount = newActualTotal.minus(amountpaid);
        fields.push("outstanding_amount = ?");
        values.push(outstandingAmount.toNumber());


        let currentExpenses = req.body.expenses !== undefined ? new Decimal(req.body.expenses) : new Decimal(prior.expenses || 0);
        let currentToll = req.body.toll_tax !== undefined ? new Decimal(req.body.toll_tax) : new Decimal(prior.toll_tax || 0);

        const updatedProfit = newActualTotal.minus(currentExpenses.plus(currentToll));

        // Then update fields and values arrays for the profit field, if not already handled
        if (!fields.includes("profit = ?")) {
          fields.push("profit = ?");
          values.push(updatedProfit.toNumber());
        }

        console.log(`Recalculated updatedProfit: ${updatedProfit.toNumber()}`);
        console.log(`Recalculated actual_total_amount: ${newActualTotal.toNumber()}`);

      } else {
        // Revert actual_total_amount to prior total_amount
        newActualTotal = new Decimal(prior.total_amount || 0);
        let currentExpenses = req.body.expenses !== undefined ? new Decimal(req.body.expenses) : new Decimal(prior.expenses || 0);
        let currentToll = req.body.toll_tax !== undefined ? new Decimal(req.body.toll_tax) : new Decimal(prior.toll_tax || 0);

        const revertedProfit = newActualTotal.minus(currentExpenses.plus(currentToll));

        if (!fields.includes("profit = ?")) {
          fields.push("profit = ?");
          values.push(revertedProfit.toNumber());
        }
        
        fields.push("actual_total_amount = ?");
        values.push(newActualTotal.toNumber());

        let amountpaid = new Decimal(prior.amount_paid || 0);
        let outstandingAmount = newActualTotal.minus(amountpaid);
        fields.push("outstanding_amount = ?");
        values.push(outstandingAmount.toNumber());

        console.log(`Reverted updatedProfit: ${revertedProfit.toNumber()}`);
        console.log(`Reverted actual_total_amount: ${newActualTotal.toNumber()}`);
      }

      fields.push("actual_distance_km = ?");
      values.push(newDist.toNumber());

    }else{
      newActualTotal = new Decimal(prior.actual_total_amount || 0);
    }

    // ------- Condition 4: amount_paid -> recalc outstanding -------
    let newPaid = null;
    let newOutstanding = null;
    if ('amount_paid' in req.body) {
        newPaid = new Decimal(req.body.amount_paid);
        newOutstanding = newActualTotal.minus(newPaid);
        fields.push("amount_paid = ?", "outstanding_amount = ?");
        values.push(newPaid.toNumber(), newOutstanding.toNumber());
    }

    // ------- Condition 5: expenses / toll_tax -> recalc profit -------
    if ('expenses' in req.body || 'toll_tax' in req.body) {
      const newExpenses = req.body.expenses !== undefined ? new Decimal(req.body.expenses) : new Decimal(prior.expenses || 0);
      const newToll = req.body.toll_tax !== undefined ? new Decimal(req.body.toll_tax) : new Decimal(prior.toll_tax || 0);

      const newProfit = newActualTotal.minus(newExpenses.plus(newToll));

      if ('expenses' in req.body) {
        fields.push("expenses = ?");
        values.push(newExpenses.toNumber());
      }
      if ('toll_tax' in req.body) {
        fields.push("toll_tax = ?");
        values.push(newToll.toNumber());
      }

      fields.push("profit = ?");
      values.push(newProfit.toNumber());
    }

    // ------- Allowed fields whitelist (manual control remains) -------
    const allowedFields = [
      'company_id', 'lead_id',
      'booking_date', 'booking_end_date',
      'booked_distance_km', 'total_amount', // direct set
      'status', 'tour_id'
      // NOTE: 'vehicle_id', 'driver_id', 'type_of_tour', 'actual_distance_km',
      // 'amount_paid', 'outstanding_amount', 'expenses','toll_tax','profit' 
      // are excluded because handled by business rules above
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(req.body[field]);
      }
    });

    // ------- Final SQL update -------
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update' });
    }

    values.push(req.params.id);
    const sql = `UPDATE bookings SET ${fields.join(', ')} WHERE id = ?`;

    await db.query(sql, values);

    if ('status' in req.body) {
      const newBookingStatus = req.body.status;

      let vehicleIdToUpdate = null;
      let driverIdToUpdate = null;

      // Prefer updated vehicle_id from current req.body
      if ('vehicle_id' in req.body) {
        vehicleIdToUpdate = req.body.vehicle_id;
      } else {
        vehicleIdToUpdate = prior.vehicle_id;
      }

      // Use assigned driver from updated vehicle if vehicle_id changed,
      // otherwise fallback to assigned_driver_id from joined vehicles or prior driver_id

      if ('vehicle_id' in req.body) {
        // Fetch assigned driver for updated vehicle
        try {
          const [vehicleRows] = await db.query('SELECT assigned_driver_id FROM vehicles WHERE id = ?', [vehicleIdToUpdate]);
          driverIdToUpdate = vehicleRows.length > 0 ? vehicleRows[0].assigned_driver_id : null;
        } catch (err) {
          console.error('Error fetching assigned driver for status update:', err);
          // Not blocking booking update, just logging
        }
      } else {
        driverIdToUpdate = prior.vehicle_assigned_driver_id || prior.driver_id;
      }

      // Define statuses for vehicles and drivers
      let vehicleStatus = null;
      let driverStatus = null;
      if (newBookingStatus === 'In Process') {
        vehicleStatus = 'On Booking';
        driverStatus = 'Not Available';
      } else if (newBookingStatus === 'Completed') {
        vehicleStatus = 'Available';
        driverStatus = 'Available';
      }

      try {
        if (vehicleIdToUpdate && vehicleStatus) {
          await db.query('UPDATE vehicles SET available_status = ? WHERE id = ?', [vehicleStatus, vehicleIdToUpdate]);
          console.log(`Updated vehicle ${vehicleIdToUpdate} status to ${vehicleStatus}`);
        }
        if (driverIdToUpdate && driverStatus) {
          await db.query('UPDATE drivers SET status = ? WHERE id = ?', [driverStatus, driverIdToUpdate]);
          console.log(`Updated driver ${driverIdToUpdate} status to ${driverStatus}`);
        }
      } catch (err) {
        console.error('Error updating vehicle or driver status:', err);
        // Not blocking booking update success, just log error
      }
    }
    res.json({ message: 'Booking details updated successfully' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE booking
exports.deleteBooking = async (req, res) => {
  try {
    await db.query('DELETE FROM bookings WHERE id = ?', [req.params.id]);
    res.json({ message: 'Booking deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
