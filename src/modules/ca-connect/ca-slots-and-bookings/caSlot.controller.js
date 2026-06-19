const service = require('./caSlot.service');
const { google } = require("googleapis");
const { sendResponse } = require('../../../utils/response');


exports.createSlots = async (req, res, next) => {
  try {
    const user = req.user;
    const data = req.body;

    const slots = await service.createOrUpdateSlots(user, data);

    return sendResponse(res, 200, { data: { slots } });
  } catch (error) {
    console.error("Error in createSlots:", error);
    error.statusCode = error.statusCode || 400;
    next(error);
  }
};

exports.getSlots = async (req, res, next) => {
  try {
    const requestedCaProfileId = req.params.caProfileId || req.query.caProfileId;
    const { startDate, endDate } = req.query;
    const caProfileId = await service.resolveCaProfileIdForSlots(
      req.user,
      requestedCaProfileId
    );

    const slots = await service.getWeeklyAvailableSlots(
      caProfileId,
      startDate,
      endDate
    );

    return sendResponse(res, 200, { data: { slots } });
  } catch (error) {
    console.error("Error in getSlots:", error);
    error.statusCode = error.statusCode || 400;
    next(error);
  }
};

exports.createBooking = async (req, res, next) => {
  try {
    const user = req.user;
    const data = req.body;

    const booking = await service.createBooking(user, data);

    return sendResponse(res, 200, { data: { booking } });
  } catch (error) {
    console.error("Error in createBooking:", error);
    error.statusCode = error.statusCode || 400;
    next(error);
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

    return sendResponse(res, 200, {
      data: booking
    });
  } catch (err) {
    next(err);
  }
};

exports.listMyBookings = async (req, res, next) => {
  try {
    const user = req.user;
    const bookings = await service.listUserBookings(user);

    return sendResponse(res, 200, {
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

    return sendResponse(res, 200, {
      data: bookings
    });
  } catch (err) {
    next(err);
  }
};

exports.getGoogleCalendarAuthUrl = async (req, res, next) => {
  try {
    const { caProfileId } = req.query;

    if (!caProfileId) {
      const error = new Error("caProfileId is required");
      error.statusCode = 400;
      throw error;
    }

    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/calendar",
        "openid",
        "email",
        "profile"
      ],
      prompt: "consent",
      state: caProfileId,
    });

    return sendResponse(res, 200, { data: { url } });
  } catch (err) {
    next(err);
  }
};
exports.googleCallback = async (req, res, next) => {
  try {
    const code = req.query.code;
    const caProfileId = req.query.state;

    if (!code) {
      throw new Error("Authorization code missing");
    }

    // 1️⃣ Get tokens
    const { tokens } = await oauth2Client.getToken(code);
    console.log("TOKENS:", tokens);

    // 🔥 2️⃣ Get user info from ID token (BEST WAY)
    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    // 3️⃣ Save in DB
    await prisma.cAProfile.update({
      where: { id: BigInt(caProfileId) },
      data: {
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token ?? undefined,
        googleTokenExpiry: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : null,
        googleCalendarEmail: payload.email,
        googleCalendarConnected: true,
      },
    });

    res.send("Google Calendar connected successfully");
  } catch (err) {
    console.error(
      "GOOGLE CALLBACK ERROR:",
      err.response?.data || err.message
    );
    next(err);
  }
};

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);
