const jwt = require('jsonwebtoken');
require('dotenv').config();
const Logger = require('../utils/logger');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) {
    Logger.security('Access token missing', {
      ip: req.ip,
      path: req.originalUrl,requestId: req.requestId
    });
    return res.status(401).json({ message: 'Access token missing' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      Logger.security('Invalid or expired token', {
        reason: err.name,
        ip: req.ip,
        path: req.originalUrl,requestId: req.requestId
      });
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired' });
      }
      return res.status(403).json({ message: 'Invalid token' });
    }
    Logger.debug('Token authenticated', {
      userId: user.id,
      role: user.role, ip: req.ip,requestId: req.requestId
    });
    req.user = user;
    next();
  });
}

module.exports = authenticateToken;
