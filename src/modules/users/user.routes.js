const router = require('express').Router();
const auth = require('../../middlewares/auth.middleware');
const allowRoles = require('../../middlewares/role.middleware');
const validate = require('../../middlewares/validate.middleware');
const CAcontroller = require('../ca-connect/ca-profile/caProfile.controller');
const controller = require('./user.controller');
const validator = require('./user.validator');
const { caUpload } = require('../../config/upload');
const CAslotcontroller = require('../ca-connect/ca-slots/caSlot.controller');


router.use(auth);

router.get('/me', controller.getCurrentUser);

// router.use(allowRoles('ADMIN'));

// router.post('/', validate(validator.createUserSchema), controller.createUser);
// // router.get('/', controller.listUsers);
// router.get('/:id', controller.getUser);
router.put('/update', validate(validator.updateUserSchema), controller.updateUser);
// router.patch(
//     '/:id/status',
//     validate(validator.updateStatusSchema),
//     controller.updateUserStatus
// );


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

module.exports = router;