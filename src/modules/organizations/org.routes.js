const router = require("express").Router();
const auth = require("../../middlewares/auth.middleware");
const orgController = require("./org.controller");
const { caUpload } = require('../../config/upload');

router.get("/me", auth, orgController.getMyOrganization);
router.put("/update", auth, orgController.updateMyOrganization);
router.post('/logo', auth, caUpload.single("file"), orgController.uploadLogo);
router.get('/logo', auth, orgController.getLogo);
router.delete('/logo', auth, orgController.deleteLogo);

module.exports = router;
