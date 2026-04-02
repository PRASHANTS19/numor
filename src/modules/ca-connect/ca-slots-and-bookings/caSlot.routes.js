const router = require('express').Router();
const controller = require('./caSlot.controller');
const authenticate = require('../../../middlewares/auth.middleware');
const role = require('../../../middlewares/role.middleware');

// CA creates slots
router.post(
    '/slots',
    authenticate,
    role('CA_USER'),
    controller.createSlots
);

router.get(
  '/bookings',
  authenticate,
  role('CA_USER'),
  controller.listCABookings
);

router.get(
  '/booking/:bookingCode',
  authenticate,
  role('CA_USER'),
  controller.getBookingByCode
);

router.get(
  '/google/calendarAuthUrl',
  authenticate,
  role('CA_USER'),
  controller.getGoogleCalendarAuthUrl
);

router.get(
  '/google/callback',
  controller.googleCallback
);

module.exports = router;
