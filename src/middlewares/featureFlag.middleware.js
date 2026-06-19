const { isFeatureEnabled } = require('../config/featureFlags');

function requireFeature(flagName) {
  return (req, res, next) => {
    if (!isFeatureEnabled(flagName)) {
      const error = new Error(`Feature "${flagName}" is disabled`);
      error.statusCode = 404;
      return next(error);
    }
    next();
  };
}

module.exports = requireFeature;
