'use strict';

const jwt = require('jsonwebtoken');
require('dotenv').config();
const Logger = require('../utils/logger');
/**
 * Authenticate Token Middleware (with cookie-parser)
 * 
 * Supports BOTH:
 * 1. Bearer tokens: Authorization: Bearer <token> (mobile/service)
 * 2. Cookie tokens: req.cookies.authToken (portal)
 * 
 * Portal sends token via httpOnly cookie automatically.
 * Mobile/service calls send Bearer token in Authorization header.
 */

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  const token = bearerToken || req.cookies?.authToken;

  if (!token) {
    Logger.security('Access token missing', {
      ip: req.ip,
      path: req.originalUrl, requestId: req.requestId
    });
    return res.status(401).json({ message: 'Access token missing' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      Logger.security('Invalid or expired token', {
        reason: err.name,
        ip: req.ip,
        path: req.originalUrl, requestId: req.requestId
      });
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
      }
      return res.status(403).json({ message: 'Invalid token' });
    }
    Logger.debug('Token authenticated', {
      userId: user.id,
      role: user.role, ip: req.ip, requestId: req.requestId
    });
    req.user = user;
    next();
  });
}

module.exports = authenticateToken;
