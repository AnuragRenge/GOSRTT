// routes/vehicles.js
const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const vehiclesController = require('../controllers/vehiclesController');
const Logger = require('../utils/logger');

// Protect all routes by adding authenticateToken middleware
router.use(authenticateToken);
router.use((req, res, next) => {
  Logger.api('Vehicles route accessed', {
    method: req.method,
    path: req.originalUrl,
    userId: req.user?.id,
    ip: req.ip,requestId: req.requestId
  });
  next();
});
router.get('/vehiclepicklist', vehiclesController.getVehiclePicklist);
router.get('/', vehiclesController.getVehicles);
router.get('/:id', vehiclesController.getVehicleById);
router.post('/', vehiclesController.createVehicle);
router.put('/:id', vehiclesController.updateVehicle);
router.delete('/:id', vehiclesController.deleteVehicle);

module.exports = router;
