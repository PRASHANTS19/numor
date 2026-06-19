function allowRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      const error = new Error('Access denied');
      error.statusCode = 403;
      return next(error);
    }
    next();
  };
}

module.exports = allowRoles;
