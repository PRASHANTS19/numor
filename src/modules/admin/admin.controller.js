const adminService = require("./admin.service");


exports.approveCAProfileUpdate = async (req, res, next) => {
  try {
    const { caProfileId } = req.params;

    const result = await adminService.approveCAProfileUpdate(caProfileId);

    res.status(200).json({
      success: true,
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

    res.status(200).json({
      success: true,
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
    res.status(200).json({
      success: true,
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
    res.status(200).json({
      success: true,
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
    res.status(200).json({
      success: true,
      data: requests
    });
  } catch (err) {
    next(err);
  }
};
