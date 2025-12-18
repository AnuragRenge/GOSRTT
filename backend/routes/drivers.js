// routes/drivers.js
const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const driversController = require('../controllers/driversController');

// Protect all routes by adding authenticateToken middleware
router.use(authenticateToken);

router.get('/driverpicklist',driversController.getDriversPicklist);
router.get('/', driversController.getDrivers);
router.get('/:id', driversController.getDriverById);
router.post('/', driversController.createDriver);
router.put('/:id', driversController.updateDriver);
router.delete('/:id', driversController.deleteDriver);

module.exports = router;
