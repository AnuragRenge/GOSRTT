// routes/companies.js
const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const companiesController = require('../controllers/companiesController');

// Protect all company routes
router.use(authenticateToken);

router.get('/companypicklist',companiesController.getCompanyPicklist);
router.get('/', companiesController.getCompanies);
router.get('/:id', companiesController.getCompanyById);
router.post('/', companiesController.createCompany);
router.put('/:id', companiesController.updateCompany);
router.delete('/:id', companiesController.deleteCompany);

module.exports = router;
