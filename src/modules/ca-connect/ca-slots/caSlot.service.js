const prisma = require('../../../config/database');
const dayjs = require('dayjs');
const customParseFormat = require("dayjs/plugin/customParseFormat");
const { ca } = require('zod/v4/locales');

exports.createOrUpdateSlots = async (user, payload) => {
    const caProfile = await prisma.cAProfile.findUnique({
        where: { userId: user.userId }
    });

    if (!caProfile) {
        throw new Error("CA profile not found");
    }
    if (caProfile.status !== 'APPROVED') {
        throw new Error("CA profile is not approved");
    }

    const allSlots = [];

    for (const [day, daySlots] of Object.entries(payload)) {

        for (const slot of daySlots) {
            const { startTime, endTime, duration, buffer, typeOfCall } = slot;
            // dayjs cannot properly work with time-only values like "10:00" so we make dummy date "2000-01-01" and append time to it and later ignore date part when saving to DB
            let current = dayjs(`2000-01-01 ${startTime}`);
            const end = dayjs(`2000-01-01 ${endTime}`);

            // ✅ validation
            if (!current.isBefore(end)) {
                throw new Error(`Invalid time range for ${day}`);
            }

            while (current.isBefore(end)) {
                const slotEnd = current.add(duration, "minute");

                if (slotEnd.isAfter(end)) break;

                allSlots.push({
                    caProfileId: caProfile.id,
                    day: day.toUpperCase(),
                    typeOfCall: typeOfCall || "BOTH",
                    startTime: current.format("HH:mm"),
                    endTime: slotEnd.format("HH:mm"),
                });

                current = slotEnd.add(buffer, "minute");
            }
        }
    }

    const [deletedSlots, createdSlots] = await prisma.$transaction([
        prisma.cASlot.deleteMany({
            where: { caProfileId: caProfile.id }
        }),
        prisma.cASlot.createMany({
            data: allSlots
        })
    ]);

    return {
        deletedCount: deletedSlots.count,
        createdCount: createdSlots.count
    };
};
const dayOrder = {
    MONDAY: 1,
    TUESDAY: 2,
    WEDNESDAY: 3,
    THURSDAY: 4,
    FRIDAY: 5,
    SATURDAY: 6,
    SUNDAY: 7
};

exports.getWeeklyAvailableSlots = async (caProfileId, startDate, endDate) => {

    const start = dayjs(startDate, "YYYY-MM-DD", true);
    const end = dayjs(endDate, "YYYY-MM-DD", true);

    if (!start.isValid() || !end.isValid()) {
        throw new Error("Invalid date format. Expected YYYY-MM-DD");
    }

    const result = {};

    // 👉 Step 1: Fetch all slots once
    const allSlots = await prisma.cASlot.findMany({
        where: {
            caProfileId: BigInt(caProfileId)
        }
    });

//   -----------------------------------------------------------------------------------------
    // cleaning expired bookings here to ensure that we don't show blocked slots as unavailable
//   ------------------------------------------------------------------------------------------
    // await prisma.cABooking.updateMany({
    //     where: {
    //         status: "INITIATED",
    //         expiresAt: { lt: new Date() }
    //     },
    //     data: { status: "EXPIRED" }
    // });

    // 👉 Step 2: Fetch bookings in range and to avoid Double booking risk we added OR code
    const bookings = await prisma.cABooking.findMany({
        where: {
            caProfileId: BigInt(caProfileId),
            bookingDate: {
                gte: new Date(start.format("YYYY-MM-DD")),
                lte: new Date(end.format("YYYY-MM-DD"))
            },
            OR: [
                { status: "CONFIRMED" },
                {
                    status: "INITIATED",
                    expiresAt: { gt: new Date() }
                }
            ]
        },
        select: {
            slotId: true,
            bookingDate: true
        }
    });
    // console.log("Fetched bookings:", bookings);
    // 👉 Step 3: Group bookings by date
    const bookingMap = {};

    for (const booking of bookings) {
        const dateKey = dayjs(booking.bookingDate).format("YYYY-MM-DD");
        if (!bookingMap[dateKey]) {
            bookingMap[dateKey] = new Set();
        }

        bookingMap[dateKey].add(booking.slotId.toString());
    }

    // 👉 Step 4: Loop through each day
    let current = start.clone();
    while (current.isBefore(end) || current.isSame(end)) {

        const dateKey = current.format("YYYY-MM-DD");

        // ✅ Format: MONDAY 26-03-2026
        const formattedKey = `${current.format("dddd").toUpperCase()} ${current.format("DD-MM-YYYY")}`;

        const day = current.format("dddd").toUpperCase();

        // filter slots for that weekday
        const slotsForDay = allSlots.filter(s => s.day === day);

        const blockedIds = bookingMap[dateKey] || new Set();

        const availableSlots = slotsForDay
            .filter(slot => !blockedIds.has(slot.id.toString()))
            .sort((a, b) => a.startTime.localeCompare(b.startTime))
            .map(slot => ({
                id: slot.id,
                startTime: slot.startTime,
                endTime: slot.endTime,
                typeOfCall: slot.typeOfCall
            }));

        // ✅ flat structure
        result[formattedKey] = availableSlots;

        current = current.add(1, "day");
    }

    return result;
};

dayjs.extend(customParseFormat);
exports.createBooking = async (user, payload) => {
    const { caProfileId, slotId, bookingDate, consultationMode } = payload;

    const expiryMinutes = 5;
    const parsedDate = dayjs(bookingDate, "DD-MM-YYYY", true);

    if (!parsedDate.isValid()) {
        throw new Error("Invalid bookingDate format. Expected DD-MM-YYYY");
    }

    if (parsedDate.isBefore(dayjs(), "day")) {
        throw new Error("Cannot book past dates");
    }

    const normalizedDateObj = new Date(parsedDate.format("YYYY-MM-DD"));
    return await prisma.$transaction(async (tx) => {

        const slot = await tx.cASlot.findUnique({
            where: { id: BigInt(slotId) }
        });

        if (!slot) {
            throw new Error("Slot not found");
        }

        const caProfile = await tx.cAProfile.findUnique({
            where: { id: BigInt(caProfileId) }
        });

        if (!caProfile) {
            throw new Error("CA profile not found");
        }

        // Clean expired holds
        await tx.cABooking.updateMany({
            where: {
                slotId: BigInt(slotId),
                bookingDate: normalizedDateObj,
                status: "INITIATED",
                expiresAt: { lt: new Date() }
            },
            data: { status: "EXPIRED" }
        });

        const existingBooking = await tx.cABooking.findFirst({
            where: {
                slotId: BigInt(slotId),
                bookingDate: normalizedDateObj,
                OR: [
                    { status: "CONFIRMED" },
                    {
                        status: "INITIATED",
                        expiresAt: { gt: new Date() }
                    }
                ]
            }
        });

        if (existingBooking) {
            throw new Error("Slot already booked or temporarily blocked");
        }

        const start = dayjs(`2000-01-01 ${slot.startTime}`);
        const end = dayjs(`2000-01-01 ${slot.endTime}`);
        const durationMinutes = end.diff(start, "minute");

        if (durationMinutes <= 0) {
            throw new Error("Invalid slot duration");
        }

        const baseAmount = (caProfile.hourlyFee / 60) * durationMinutes;
        const taxPercent = caProfile.taxPercent || 0;
        const amount = Number(baseAmount.toFixed(2));

        try {
            const booking = await tx.cABooking.create({
                data: {
                    bookingCode: `BOOK-${crypto.randomUUID()}`,
                    userId: BigInt(user.userId),
                    caProfileId: BigInt(caProfileId),
                    slotId: BigInt(slotId),
                    bookingDate: normalizedDateObj,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    consultationMode,
                    durationMinutes,
                    amount,
                    taxPercent,
                    status: "INITIATED",
                    expiresAt: dayjs().add(expiryMinutes, "minute").toDate()
                }
            });

            return booking;
        } catch (error) {
            if (error.code === "P2002") {
                throw new Error("Slot already booked");
            }
            throw error;
        }
    });
};