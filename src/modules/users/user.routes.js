const router = require('express').Router();
const auth = require('../../middlewares/auth.middleware');
const role = require('../../middlewares/role.middleware');
const validate = require('../../middlewares/validate.middleware');
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
    controller.saveWidgets
);
router.delete('/widgets/delete',
    controller.deleteWidget
);
router.put('/update',
    validate(validator.updateUserSchema),
    controller.updateUser
);
router.post(
    '/profilePhoto',
    role('SME_USER'),
    caUpload.single("file"),
    controller.uploadProfilePhoto
);
router.get(
    '/profilePhoto',
    role('SME_USER'),
    controller.getProfilePhoto
);
router.delete(
    '/profilePhoto',
    role('SME_USER'),
    controller.deleteProfilePhoto
);
router.get(
    '/listCAs',
    role('SME_USER'),
    CAcontroller.listCAs);

// Get slots for users
router.get(
    '/caslots/:caProfileId',
    role('SME_USER'),
    CAslotcontroller.getSlots
);

router.post(
    '/bookCA',
    role('SME_USER'),
    CAslotcontroller.createBooking
);

router.get(
    '/bookings',
    role('SME_USER'),
    CAslotcontroller.listMyBookings
);

router.get(
    '/:bookingCode',
    role('SME_USER'),
    CAslotcontroller.getBookingByCode
);

module.exports = router;