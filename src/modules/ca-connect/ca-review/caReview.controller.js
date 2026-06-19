const caReviewService = require('./caReview.service');
const { sendResponse } = require('../../../utils/response');

/**
 * Create CA Review (Customer)
 */
exports.createReview = async (req, res, next) => {
  try {
    const review = await caReviewService.createReview(
      req.user,
      req.body
    );

    return sendResponse(res, 201, {
      message: 'Review submitted successfully',
      data: review
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get reviews for CA profile (Public)
 */
exports.getReviewsForCA = async (req, res, next) => {
  try {
    const { caProfileId } = req.params;

    const reviews = await caReviewService.getReviewsForCA(
      BigInt(caProfileId)
    );

    return sendResponse(res, 200, {
      data: reviews
    });
  } catch (err) {
    next(err);
  }
};
