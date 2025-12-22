// routes/drivers.js
const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const driversController = require('../controllers/driversController');
const Logger = require('../utils/logger');

// Protect all routes by adding authenticateToken middleware
router.use(authenticateToken);
router.use((req, res, next) => {
  Logger.api('Drivers route accessed', {
    method: req.method,
    path: req.originalUrl,
    userId: req.user?.id,
    ip: req.ip,requestId: req.requestId
  });
  next();
});

router.get('/driverpicklist', driversController.getDriversPicklist);
router.get('/', driversController.getDrivers);
router.get('/:id', driversController.getDriverById);
router.post('/', driversController.createDriver);
router.put('/:id', driversController.updateDriver);
router.delete('/:id', driversController.deleteDriver);

module.exports = router;
