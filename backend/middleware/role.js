function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    const user = req.user; // from JWT middleware

    if (!user || !allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    next();
  };
}
module.exports = authorizeRoles;
