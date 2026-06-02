const router = require('express').Router();
const auth = require('../../middlewares/auth.middleware');
const role = require('../../middlewares/role.middleware');
const validate = require('../../middlewares/validate.middleware');
const { requirePermission, requireOrgOwner } = require('../../middlewares/permission.middleware');
const CAcontroller = require('../ca-connect/ca-profile/caProfile.controller');
const controller = require('./user.controller');
const validator = require('./user.validator');
const { caUpload } = require('../../config/upload');
const CAslotcontroller = require('../ca-connect/ca-slots-and-bookings/caSlot.controller');


router.use(auth);

router.get('/me',
    controller.getCurrentUser
);
router.post('/widgets',
    requirePermission('dashboard', 'write'),
    controller.saveWidgets
);
// router.delete('/widgets/delete',
//     controller.deleteWidget
// );
router.put('/update',
    validate(validator.updateUserSchema),
    controller.updateUser
);
router.post(
    '/profilePhoto',
    caUpload.single("file"),
    controller.uploadProfilePhoto
);
router.get(
    '/profilePhoto',
    controller.getProfilePhoto
);
router.delete(
    '/profilePhoto',
    controller.deleteProfilePhoto
);

router.post('/inviteNewUser', requireOrgOwner, controller.inviteNewUser);

router.get(
    '/listCAs',
    CAcontroller.listCAs);

// Get slots for users
router.get(
    '/caslots/:caProfileId',
    CAslotcontroller.getSlots
);

router.post(
    '/bookCA',
    CAslotcontroller.createBooking
);

router.get(
    '/bookings',
    CAslotcontroller.listMyBookings
);

router.get(
    '/:bookingCode',
    CAslotcontroller.getBookingByCode
);

module.exports = router;
