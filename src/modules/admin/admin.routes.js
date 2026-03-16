const router = require('express').Router();
const authenticate = require('../../middlewares/auth.middleware');
const role = require('../../middlewares/role.middleware');
const controller = require('./admin.controller');


router.post(
    "/ca/:caProfileId/approve",
    authenticate,
    role('ADMIN'),
    controller.approveCAProfileUpdate
);

router.post(
    "/ca/:caProfileId/reject",
    authenticate,
    role('ADMIN'),
    controller.rejectCAProfileUpdate
);

router.get(
  "/ca/pending",
  authenticate,
  role("ADMIN"),
  controller.listPendingCARequest
);

router.get(
  "/ca/pending/:pendingId",
  authenticate,
  role("ADMIN"),
  controller.getPendingRequestDetails
);

router.get(
  "/admin/ca/requests",
  authenticate,
  role("ADMIN"),
  controller.listRequestsByStatus
);

module.exports = router;