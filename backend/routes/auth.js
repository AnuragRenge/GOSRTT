const express = require('express');
const router = express.Router();
const Logger = require('../utils/logger');


router.use((req, res, next) => {
  Logger.api('Auth route accessed', {
    method: req.method,
    path: req.originalUrl,
    userId: req.user?.id,
    ip: req.ip,requestId: req.requestId
  });
  next();
});

const authRateLimiter = require('../middleware/authRateLimiter');
const authController = require('../controllers/authController');


// Auth
router.post('/register', authRateLimiter, authController.register);
router.post('/login', authRateLimiter, authController.login);

// Password reset
router.post('/forgot-password', authRateLimiter, authController.forgotPassword);
router.post('/reset-password', authRateLimiter, authController.resetPassword);

module.exports = router;
