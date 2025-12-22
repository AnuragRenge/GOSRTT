// routes/tours.js
const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const toursController = require('../controllers/toursController');
const Logger = require('../utils/logger');

// Protect all routes
router.use(authenticateToken);
router.use((req, res, next) => {
  Logger.api('Tours route accessed', {
    method: req.method,
    path: req.originalUrl,
    userId: req.user?.id,
    ip: req.ip,requestId: req.requestId
  });
  next();
});

router.get('/', toursController.getTours);
router.get('/:id', toursController.getTourById);
router.post('/', toursController.createTour);
router.put('/:id', toursController.updateTour);
router.delete('/:id', toursController.deleteTour);

module.exports = router;
