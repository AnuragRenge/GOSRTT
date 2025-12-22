const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const leadsController = require('../controllers/leadsController');
Logger = require('../utils/logger');
router.use(authenticateToken);
router.use((req, res, next) => {
  Logger.api('Lead route accessed', {
    method: req.method,
    path: req.originalUrl,
    userId: req.user?.id,
    ip: req.ip,requestId: req.requestId
  });
  next();
});

router.get('/leadpicklist', leadsController.getLeadPicklist);
router.get('/', leadsController.getLeads);
router.get('/:id', leadsController.getLeadById);
router.post('/', leadsController.createLead);
router.put('/:id', leadsController.updateLead);
router.delete('/:id', leadsController.deleteLead);

module.exports = router;
