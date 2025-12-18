const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const leadsController = require('../controllers/leadsController');
router.use(authenticateToken);

router.get('/leadpicklist', leadsController.getLeadPicklist);
router.get('/', leadsController.getLeads);
router.get('/:id', leadsController.getLeadById);
router.post('/', leadsController.createLead);
router.put('/:id', leadsController.updateLead);
router.delete('/:id', leadsController.deleteLead);

module.exports = router;
