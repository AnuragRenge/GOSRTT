const { v4: uuidv4 } = require('uuid');

module.exports = function requestId(req, res, next) {
  // Use incoming request-id if present (proxy / gateway support)
  const incomingId = req.headers['x-request-id'];

  const requestId = incomingId || uuidv4();

  req.requestId = requestId;

  // Expose to client (very important)
  res.setHeader('X-Request-Id', requestId);

  next();
};
