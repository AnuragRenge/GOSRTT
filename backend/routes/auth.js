const express = require('express');
const router = express.Router();
const Logger = require('../utils/logger');
const authenticateToken = require('../middleware/auth');

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

/* ===================
   Protected Routes
=================== */

// GET /api/auth/me (verify session)
router.get('/me', authenticateToken, authController.me);

// POST /api/auth/refresh (refresh access token)
router.post('/refresh', authRateLimiter, authController.refresh);

// POST /api/auth/logout (clear cookies)
router.post('/logout', authenticateToken, authController.logout);

module.exports = router;
