// routes/tours.js
const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const toursController = require('../controllers/toursController');

// Protect all routes
router.use(authenticateToken);

router.get('/', toursController.getTours);
router.get('/:id', toursController.getTourById);
router.post('/', toursController.createTour);
router.put('/:id', toursController.updateTour);
router.delete('/:id', toursController.deleteTour);

module.exports = router;
