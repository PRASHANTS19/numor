const { FLAGS } = require('../../config/featureFlags');

exports.getFeatureFlags = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        ...FLAGS,
      },
    });
  } catch (err) {
    next(err);
  }
};
