const { isFeatureEnabled } = require('../config/featureFlags');

function requireFeature(flagName) {
  return (req, res, next) => {
    if (!isFeatureEnabled(flagName)) {
      return res.status(404).json({
        success: false,
        message: `Feature "${flagName}" is disabled`,
      });
    }
    next();
  };
}

module.exports = requireFeature;
