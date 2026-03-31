const router = require('express').Router();
const authenticate = require('../../middlewares/auth.middleware');
const role = require('../../middlewares/role.middleware');
const controller = require('./admin.controller');


router.post(
    "/ca/caprofile/:caProfileId/approveUpdate",
    authenticate,
    role('ADMIN'),
    controller.approveCAProfileUpdate
);

router.post(
    "/ca/caprofile/:caProfileId/rejectUpdate",
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
  "ca/requests",
  authenticate,
  role("ADMIN"),
  controller.listRequestsByStatus
);

// apis for approval/rejection of CA profile when he creates for the first time
router.get(
  "/ca/caprofile/requests",
  authenticate,
  role("ADMIN"),
  controller.getPendingCAs 
);

router.get(
  "/ca/caprofile/requests/:caId",
  authenticate,
  role("ADMIN"),
  controller.getCAForReview  
);

router.get(
  "/ca/caprofile/:caId/approve",
  authenticate,
  role("ADMIN"),
  controller.approveCAProfile   
);


router.get(
  "/ca/caprofile/:caId/reject",
  authenticate,
  role("ADMIN"),
  controller.rejectCAProfile   
);

router.get(
  "/ca/caprofile/getMarketplaceCAs",
  authenticate,
  role("ADMIN"),
  controller.getMarketplaceCAs   
);

router.get(
  "/comparison/:caId",
  authenticate,
  role('ADMIN'),
  controller.getProfileComparison
);


router.get(
  "/ca-profiles/counts",
  authenticate,
  role('ADMIN'),
  controller.getCAProfileCounts
)

router.get(
  "/ca-profiles",
  authenticate,
  role('ADMIN'),
  controller.listCAProfiles
)

router.post(
  "/ca/caprofile/:caProfileId/suspend",
  authenticate,
  role('ADMIN'),
  controller.suspendCAProfile
);

module.exports = router;