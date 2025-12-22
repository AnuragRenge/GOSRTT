// routes/users.js
const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const usersController = require('../controllers/usersController');
const Logger = require('../utils/logger');

router.use(authenticateToken);

router.use((req, res, next) => {
  Logger.api('User route accessed', {
    method: req.method,
    path: req.originalUrl,
    userId: req.user?.id,
    ip: req.ip,requestId: req.requestId
  });
  next();
});

router.get('/', usersController.getUsers);
router.get('/page/', usersController.getUserspage);
router.get('/:id', usersController.getUserById);
router.post('/', usersController.createUser);
router.put('/:id', usersController.updateUser);
router.delete('/:id', usersController.deleteUser);

module.exports = router;
