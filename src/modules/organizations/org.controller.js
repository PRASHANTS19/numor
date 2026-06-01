const orgService = require("./org.service");
const { sendResponse } = require("../../utils/response");

async function getMyOrganization(req, res, next) {
  try {
    const org = await orgService.getById(req.user.orgId);

    return sendResponse(res, 200, { data: org });
  } catch (err) {
    next(err);
  }
}

async function updateMyOrganization(req, res, next) {
  try {
    const org = await orgService.update(
      req.user.orgId,
      req.body
    );

    return sendResponse(res, 200, {
      message: "Organization updated",
      data: org,
    });
  } catch (err) {
    next(err);
  }
}

async function uploadLogo(req, res, next) {
  try {
    const user = req.user;
    const file = req.file;
    const logoUrl = await orgService.uploadLogo(user, file);
    return sendResponse(res, 200, { data: { logoUrl } });
  } catch (err) {
    next(err);
  }
};

async function getLogo(req, res, next) {
  try {
    const user = req.user;
    const logoUrl = await orgService.getLogo(user);
    return sendResponse(res, 200, { data: { logoUrl } });
  } catch (err) {
    next(err);
  }
}

async function deleteLogo(req, res, next) {
  try {
    const user = req.user;
    await orgService.deleteLogo(user);
    return sendResponse(res, 200, { message: "Logo deleted successfully" });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMyOrganization,
  updateMyOrganization,
  uploadLogo,
  getLogo,
  deleteLogo
};
