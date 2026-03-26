const prisma = require('../../../config/database');
const dayjs = require('dayjs');
const isSameOrBefore = require('dayjs/plugin/isSameOrBefore');
const isSameOrAfter = require("dayjs/plugin/isSameOrAfter");

exports.createOrUpdateSlots = async (user, payload) => {
    const caProfile = await prisma.cAProfile.findUnique({
        where: { userId: user.userId }
    });

    if (!caProfile) {
        throw new Error("CA profile not found");
    }
    if (caProfile.status  !== 'APPROVED') {
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

exports.getSlots = async (user) => {
    const caProfile = await prisma.cAProfile.findUnique({
        where: { userId: user.userId }
    });

    if (!caProfile) {
        throw new Error("CA profile not found");
    }

    const slots = await prisma.cASlot.findMany({
        where: { caProfileId: caProfile.id }
    });

    slots.sort((a, b) => {
        if (dayOrder[a.day] !== dayOrder[b.day]) {
            return dayOrder[a.day] - dayOrder[b.day];
        }
        return a.startTime.localeCompare(b.startTime);
    });
    return slots;
};

exports.blockSlot = async (slotId, caProfileId) => {
    const slot = await prisma.cASlot.findFirst({
        where: {
            id: BigInt(slotId),
            caProfileId,
            status: 'AVAILABLE'
        }
    });

    if (!slot) throw new Error('Slot not available');

    await prisma.cASlot.update({
        where: { id: BigInt(slotId) },
        data: { status: 'BOOKED' }
    });
};
