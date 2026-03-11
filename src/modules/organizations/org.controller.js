const orgService = require("./org.service");

async function getMyOrganization(req, res) {
  const org = await orgService.getById(req.user.orgId);

  res.json({
    success: true,
    data: org,
  });
}

async function updateMyOrganization(req, res) {
  const org = await orgService.update(
    req.user.orgId,
    req.body
  );

  res.json({
    success: true,
    message: "Organization updated",
    data: org,
  });
}

async function uploadLogo(req, res, next) {
  try {
    const user = req.user;
    const file = req.file;
    const logoUrl = await orgService.uploadLogo(user, file);
    res.json({ success: true, logoUrl });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

async function getLogo(req, res, next) {
  try {
    const user = req.user;
    const logoUrl = await orgService.getLogo(user);
    res.json({ success: true, logoUrl });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function deleteLogo(req, res, next) {
  try {
    const user = req.user;
    await orgService.deleteLogo(user);
    res.json({ success: true, message: "Logo deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = {
  getMyOrganization,
  updateMyOrganization,
  uploadLogo,
  getLogo,
  deleteLogo
};
