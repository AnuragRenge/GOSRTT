const express = require('express');
const router = express.Router();

const authenticateToken = require('../middleware/auth');
const bookingController = require('../controllers/bookingController');
const Logger = require('../utils/logger');

router.use(authenticateToken);
router.use((req, res, next) => {
  Logger.api('Booking route accessed', {
    method: req.method,
    path: req.originalUrl,
    userId: req.user?.id,
    ip: req.ip,requestId: req.requestId
  });
  next();
});

// Route Definitions
router.get('/', bookingController.getBookings);
router.get('/:id', bookingController.getBookingById);
router.post('/', bookingController.createBooking);
router.put('/:id', bookingController.updateBooking);
router.delete('/:id', bookingController.deleteBooking);

module.exports = router;
