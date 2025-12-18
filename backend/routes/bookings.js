const express = require('express');
const router = express.Router();

const authenticateToken = require('../middleware/auth');
const bookingController = require('../controllers/bookingController');

router.use(authenticateToken);

// Route Definitions
router.get('/', bookingController.getBookings);
router.get('/:id', bookingController.getBookingById);
router.post('/', bookingController.createBooking);
router.put('/:id', bookingController.updateBooking);
router.delete('/:id', bookingController.deleteBooking);

module.exports = router;
