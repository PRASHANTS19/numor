const { mime } = require('zod');
const prisma = require('../../config/database');
const storageService = require('../../storage/storage.service');

function filterValidFields(data) {
    return Object.fromEntries(
        Object.entries(data).filter(([_, value]) => {
            if (value === null || value === undefined) return false;

            if (typeof value === "string" && value.trim() === "") return false;

            if (Array.isArray(value) && value.length === 0) return false;

            return true;
        })
    );
}

exports.approveCAProfileUpdate = async (caProfileId) => {

    return prisma.$transaction(async (tx) => {

        const pendingProfile = await tx.CAProfilePending.findUnique({
            where: { caProfileId },
            include: {
                documents: true
            }
        });

        if (!pendingProfile) {
            throw new Error("No pending profile update found");
        }

        // remove fields that should not be copied
        const {
            id,
            caProfileId: _,
            createdAt,
            updatedAt,
            status,
            documents,
            ...profileFields
        } = pendingProfile;

        // filter valid fields
        const filteredUpdateData = filterValidFields(profileFields);

        // 2️⃣ update main profile only with valid fields
        const updatedProfile = await tx.CAProfile.update({
            where: { id: caProfileId },
            data: filteredUpdateData
        });

        // 3️⃣ move documents
        if (pendingProfile.documents.length > 0) {
            for (const doc of pendingProfile.documents) {
                if (doc.operation === "ADD") {
                    await tx.CADocument.create({
                        data: {
                            caProfileId,
                            type: doc.type,
                            fileKey: doc.fileKey,
                            mimeType: doc.mimeType,
                            description: doc.description
                        }
                    });
                }

                if (doc.operation === "DELETE") {
                    // delete from storage
                    await storageService.remove(doc.fileKey);
                    // delete from DB
                    await tx.CADocument.deleteMany({
                        where: {
                            caProfileId,
                            fileKey: doc.fileKey
                        }
                    });
                }
                if (doc.operation === "UPDATE") {
                    // optional future
                }
            }
            await tx.CADocumentPending.deleteMany({
                where: {
                    pendingId: pendingProfile.id
                }
            });
        }
        // 4️⃣ delete pending profile
        await tx.CAProfilePending.delete({
            where: {
                id: pendingProfile.id
            }
        });

        return updatedProfile;
    });
};

exports.rejectCAProfileUpdate = async (caProfileId, comment) => {
    // ✅ STEP 1: fetch pending profile OUTSIDE transaction
    const pendingProfile = await prisma.cAProfilePending.findUnique({
        where: { caProfileId },
        include: {
            documents: true
        }
    });
    if (!pendingProfile) {
        throw new Error("No pending profile update found");
    }
    // ✅ STEP 2: collect files to delete (ONLY ADD)
    const filesToDelete = pendingProfile.documents
        .filter(doc => doc.operation === "ADD")
        .map(doc => doc.fileKey);
    // ✅ STEP 3: DB transaction
    const result = await prisma.$transaction(async (tx) => {
        // update status
        const rejectedProfile = await tx.cAProfilePending.update({
            where: { id: pendingProfile.id },
            data: {
                status: "REJECTED",
                comment: comment || "Update rejected by admin"
            }
        });
        // delete pending records
        await tx.cADocumentPending.deleteMany({
            where: {
                pendingId: pendingProfile.id
            }
        });
        return rejectedProfile;
    });
    // ✅ STEP 4: delete files AFTER transaction success
    for (const key of filesToDelete) {
        try {
            await storageService.remove(key);
        } catch (err) {
            console.error("Failed to delete file from storage:", key, err);
            // optional: log for retry queue
        }
    }
    return result;
};

exports.listPendingCARequest = async () => {
    return prisma.cAProfilePending.findMany({
        where: {
            status: "UNDER_REVIEW"
        },
        include: {
            caProfile: {
                select: {
                    id: true,
                    userId: true
                }
            }
        },
        orderBy: {
            createdAt: "desc"
        }
    });
};

exports.getPendingRequestDetails = async (pendingId) => {
    return prisma.cAProfilePending.findUnique({
        where: { id: BigInt(pendingId) },
        include: {
            caProfile: true,
            documents: true
        }
    });
};

exports.listRequestsByStatus = async (status) => {
    return prisma.cAProfilePending.findMany({
        where: status ? { status } : {},
        include: {
            caProfile: true
        },
        orderBy: {
            createdAt: "desc"
        }
    });
};

exports.getPendingCAs = async () => {
    return prisma.cAProfile.findMany({
        where: {
            status: "UNDER_REVIEW"
        },
        include: {
            user: true,
            //   documents: true
        },
        orderBy: {
            createdAt: "desc"
        }
    });
};

exports.getCAForReview = async (caId) => {
    return prisma.cAProfile.findUnique({
        where: {
            id: BigInt(caId)
        },
        include: {
            user: true,
            documents: true
        }
    });
};

exports.approveCAProfile = async (caId, adminId) => {

    const profile = await prisma.cAProfile.findUnique({
        where: { id: BigInt(caId) }
    });

    if (!profile) {
        throw new Error("CA profile not found");
    }

    if (profile.status !== "UNDER_REVIEW") {
        throw new Error("Profile is not under review");
    }

    return prisma.cAProfile.update({
        where: {
            id: BigInt(caId)
        },
        data: {
            status: "APPROVED"
        }
    });
};

exports.rejectCAProfile = async (caId, comment) => {

    return prisma.cAProfile.update({
        where: {
            id: BigInt(caId)
        },
        data: {
            status: "REJECTED",
            comment: comment || "Profile rejected by admin"
        }
    });
};

exports.getMarketplaceCAs = async () => {
    return prisma.cAProfile.findMany({
        where: {
            status: "APPROVED"
        },
        include: {
            user: true
        }
    });
};

exports.getProfileComparison = async (user, caId) => {

    const profile = await prisma.cAProfile.findUnique({
        where: { id: caId },
        include: {
            documents: true
        }
    });

    if (!profile) {
        throw new Error("CA profile not found");
    }

    const pendingProfile = await prisma.cAProfilePending.findUnique({
        where: { caProfileId: profile.id },
        include: {
            documents: true
        }
    });

    return {
        approvedProfile: profile,
        pendingProfile: pendingProfile
    };
};