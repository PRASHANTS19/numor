const { FLAGS } = require('../../config/featureFlags');
const { sendResponse } = require('../../utils/response');

exports.getFeatureFlags = async (req, res, next) => {
  try {
    return sendResponse(res, 200, {
      data: {
        ...FLAGS,
      },
    });
  } catch (err) {
    next(err);
  }
};
