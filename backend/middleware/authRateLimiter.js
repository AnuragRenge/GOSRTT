const rateLimit = require('express-rate-limit');
const Logger = require('../utils/logger');
require('dotenv').config();

const TTL = process.env.RATE_LIMIT_TIME * 60 * 1000; // convert minutes to milliseconds

const authRateLimiter = rateLimit({
  windowMs: TTL,
  max: process.env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    Logger.security('Auth rate limit exceeded', {
      ip: req.ip,
      path: req.originalUrl,requestId: req.requestId
    });
    res.status(429).json({
      message: 'Too many attempts. Please try again later.'
    });
  }
});

module.exports = authRateLimiter;
