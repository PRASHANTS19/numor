const { generateBookingCode } = require('../../../utils/bookingCode');
const prisma = require('../../../config/database');

exports.createBooking = async (user, payload) => {
  return prisma.cABooking.create({
    data: {
      bookingCode: generateBookingCode(),

      userId:  user.userId,
      caProfileId: payload.caProfileId,

      consultationMode: payload.consultationMode,
      scheduledAt: payload.scheduledAt,
      durationMinutes: payload.durationMinutes ?? 60,

      amount: payload.amount,
      currency: payload.currency || 'INR',

      status: 'INITIATED'
    }
  });
};


/**
 * Get booking by bookingCode
 * Accessible by:
 * - Booking owner (USER)
 * - Assigned CA
 */
exports.getByBookingCode = async (bookingCode, user) => {
  const booking = await prisma.cABooking.findUnique({
    where: { bookingCode },
    include: {
      caProfile: {
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      },
      user: {
        select: { id: true, name: true, email: true }
      },
      payment: true,
      review: true
    }
  });

  if (!booking) {
    throw new Error('Booking not found');
  }

  // console.log(booking);

  // const isCustomer = booking.userId === user.userId;

  // if (!isCustomer) {
  //   throw new Error('Unauthorized access to booking');
  // }

  return booking;
};

/**
 * List bookings for logged-in USER (Customer)
 */
exports.listUserBookings = async (user) => {
  return prisma.cABooking.findMany({
    where: { userId: user.userId },
    orderBy: { scheduledAt: 'desc' },
    include: {
      caProfile: {
        select: {
          id: true,
          hourlyFee: true,
          user: {
            select: { name: true }
          }
        }
      },
      payment: true,
      review: true
    }
  });
};

/**
 * List bookings for logged-in CA-- from CA profile with help of its userID we fetch its ID and then fetch bookings with that ID in caBooking
 */
exports.listCABookings = async (CA) => {
  const caProfile = await prisma.cAProfile.findUnique({
    where: { userId: CA.userId }
  });

  if (!caProfile) {
    throw new Error('CA profile not found');
  }

  return prisma.cABooking.findMany({
    where: { caProfileId: caProfile.id },
    orderBy: { scheduledAt: 'desc' },
    include: {
      user: {
        select: { id: true, name: true, email: true }
      },
      payment: true,
      review: true
    }
  });
};

/**
 * Cancel booking (Customer only)
 */
exports.cancelBooking = async (bookingCode, userId) => {
  const booking = await prisma.cABooking.findUnique({
    where: { bookingCode }
  });

  if (!booking) {
    throw new Error('Booking not found');
  }

  if (booking.userId !== userId) {
    throw new Error('You can cancel only your own bookings');
  }

  if (
    booking.status === BookingStatus.CANCELLED ||
    booking.status === BookingStatus.COMPLETED
  ) {
    throw new Error('Booking cannot be cancelled');
  }

  return prisma.cABooking.update({
    where: { bookingCode },
    data: {
      status: BookingStatus.CANCELLED
    }
  });
};
