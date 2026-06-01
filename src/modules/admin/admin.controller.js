const adminService = require("./admin.service");
const { sendResponse } = require("../../utils/response");


exports.approveCAProfileUpdate = async (req, res, next) => {
  try {
    const { caProfileId } = req.params;

    const result = await adminService.approveCAProfileUpdate(caProfileId);

    return sendResponse(res, 200, {
      message: "CA profile update approved successfully",
      data: result
    });

  } catch (err) {
    next(err);
  }
};

exports.rejectCAProfileUpdate = async (req, res, next) => {
  try {
    const { caProfileId } = req.params; 
    const result = await adminService.rejectCAProfileUpdate(caProfileId);

    return sendResponse(res, 200, {
      message: "CA profile update rejected successfully",
      data: result
    });

  } catch (err) {
    next(err);
  }
};

exports.listPendingCARequest = async (req, res, next) => {
  try {
    const pendingRequests = await adminService.listPendingCARequest();
    return sendResponse(res, 200, {
      data: pendingRequests
    });
  } catch (err) {
    next(err);
  }
};

exports.getPendingRequestDetails = async (req, res, next) => {
  try {
    const { pendingId } = req.params;
    const details = await adminService.getPendingRequestDetails(pendingId);
    return sendResponse(res, 200, {
      data: details
    });
  } catch (err) {
    next(err);
  }
};

exports.listRequestsByStatus = async (req, res, next) => {
  try {
    const { status } = req.query;
    const requests = await adminService.listRequestsByStatus(status);
    return sendResponse(res, 200, {
      data: requests
    });
  } catch (err) {
    next(err);
  }
};

exports.getPendingCAs = async (req, res, next) => {
  try {
    const pendingCAs = await adminService.getPendingCAs();
    return sendResponse(res, 200, {
      data: pendingCAs
    });
  } catch (err) {
    next(err);
  }
};

exports.getCAForReview = async (req, res, next) => {
  try {
    const { caId } = req.params;
    const caDetails = await adminService.getCAForReview(caId);
    return sendResponse(res, 200, {
      data: caDetails
    });
  } catch (err) {
    next(err);
  }
}

exports.approveCAProfile = async (req, res, next) => {
  try {
    const { caId } = req.params;
    const result = await adminService.approveCAProfile(caId);
    return sendResponse(res, 200, {
      message: "CA profile approved successfully",
      data: result
    });
  } catch (err) {
    next(err);
  }
};

exports.rejectCAProfile = async (req, res, next) => {
  try {
    const { caId, comment } = req.params;
    const result = await adminService.rejectCAProfile(caId, comment);
    return sendResponse(res, 200, {
        message: "CA profile rejected successfully",
        data: result
    });
  } catch (err) {
    next(err);
  }
}

exports.getMarketplaceCAs = async (req, res, next) => {
  try {
    const cas = await adminService.getMarketplaceCAs();
    return sendResponse(res, 200, {
      data: cas
    });
  } catch (err) {
    next(err);
    }
}

exports.getProfileComparison = async (req, res, next) => {
  try {
    const caId = req.params.caId;
    const result = await adminService.getProfileComparison(req.user, caId);

    return sendResponse(res, 200, {
      data: result
    });

  } catch (error) {
    next(error);
  }
};

exports.getCAProfileCounts = async (req, res, next) => {
  try {
    const counts = await adminService.getCAProfileCounts();
    return sendResponse(res, 200, {
      data: counts
    });
  } catch (err) {
    next(err);
  }
}

exports.listCAProfiles = async (req, res, next) => {
  try {
    const { tab = 'underReview', page = 1, limit = 20 } = req.query;
    const result = await adminService.listCAProfiles(tab, page, limit);
    return sendResponse(res, 200, {
      data: result
    });
  }
    catch (err) {
    next(err);
  }
}

exports.suspendCAProfile = async (req, res, next) => {
  try {
    const { caProfileId } = req.params;
    const { comment } = req.body;
    const result = await adminService.suspendCAProfile(caProfileId, comment);
    return sendResponse(res, 200, {
      message: "CA profile suspended successfully"
    });
  } catch (err) {
    next(err);
  }
}
