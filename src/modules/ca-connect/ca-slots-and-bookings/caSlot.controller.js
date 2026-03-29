const service = require('./caSlot.service');

exports.createSlots = async (req, res) => {
  try {
    const user = req.user;
    const data = req.body;

    const slots = await service.createOrUpdateSlots(user, data);

    res.json({ success: true, slots });
  } catch (error) {
    console.error("Error in createSlots:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Something went wrong"
    });
  }
};

exports.getSlots = async (req, res) => {
  try {
    const caProfileId = req.params.caProfileId;
    const { startDate, endDate } = req.query;

    const slots = await service.getWeeklyAvailableSlots(
      caProfileId,
      startDate,
      endDate
    );

    res.json({ success: true, slots });
  } catch (error) {
    console.error("Error in getSlots:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Something went wrong"
    });
  }
};

exports.createBooking = async (req, res) => {
  try {
    const user = req.user;
    const data = req.body;

    const booking = await service.createBooking(user, data);

    res.json({ success: true, booking });
  } catch (error) {
    console.error("Error in createBooking:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Something went wrong"
    });
  }
};

//here normal user is need to get its latest booking by booking code
exports.getBookingByCode = async (req, res, next) => {
  try {
    const { bookingCode } = req.params;

    const booking = await service.getByBookingCode(
      bookingCode,
      req.user
    );

    res.json({
      success: true,
      data: booking
    });
  } catch (err) {
    next(err);
  }
};

exports.listMyBookings = async (req, res, next) => {
  try {
    user = req.user;
    const bookings = await service.listUserBookings(user);

    res.json({
      success: true,
      data: bookings
    });
  } catch (err) {
    next(err);
  }
};

exports.listCABookings = async (req, res, next) => {
  try {
    const CA = req.user;
    const bookings = await service.listCABookings(CA);

    res.json({
      success: true,
      data: bookings
    });
  } catch (err) {
    next(err);
  }
};