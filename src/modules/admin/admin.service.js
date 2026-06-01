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

    if (profile.status !== "UNDER_REVIEW" && profile.status !== "SUSPENDED") {
        throw new Error("Only profiles under review or suspended states can be approved. Current status: " + profile.status);
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

exports.getCAProfileCounts = async () => {
    try {
        const [
            unverified,
            underReview,
            verified,
            rejected,
            suspended,
            unverifiedUpdates,
            updatesUnderReview,
            updatesRejected,
        ] = await Promise.all([
            // 1. Unverified: status PENDING, no pending profile
            prisma.cAProfile.count({
                where: {
                    status: 'PENDING',
                    pendingProfile: null,
                },
            }),

            // 2. Under Review: status UNDER_REVIEW, no pending profile
            prisma.cAProfile.count({
                where: {
                    status: 'UNDER_REVIEW',
                    pendingProfile: null,
                },
            }),

            // 3. Verified: status APPROVED, no pending profile
            prisma.cAProfile.count({
                where: {
                    status: 'APPROVED',
                    pendingProfile: null,
                },
            }),

            // 4. Rejected: status REJECTED, no pending profile
            prisma.cAProfile.count({
                where: {
                    status: 'REJECTED',
                    pendingProfile: null,
                },
            }),

            // 5. Suspended
            prisma.cAProfile.count({
                where: {
                    status: 'SUSPENDED',
                },
            }),

            // 6. Unverified Updates: APPROVED + pending status PENDING
            prisma.cAProfile.count({
                where: {
                    status: 'APPROVED',
                    pendingProfile: { status: 'PENDING' },
                },
            }),

            // 7. Updates Under Review: APPROVED + pending status UNDER_REVIEW
            prisma.cAProfile.count({
                where: {
                    status: 'APPROVED',
                    pendingProfile: { status: 'UNDER_REVIEW' },
                },
            }),

            // 8. Updates Rejected: APPROVED + pending status REJECTED
            prisma.cAProfile.count({
                where: {
                    status: 'APPROVED',
                    pendingProfile: { status: 'REJECTED' },
                },
            }),
        ]);

         return {
                unverified,
                underReview,
                verified,
                rejected,
                suspended,
                unverifiedUpdates,
                updatesUnderReview,
                updatesRejected,
                // Aggregated counts for main tabs
                pendingReview: underReview + updatesUnderReview,
                allRejected: rejected + updatesRejected,
                total:  unverified + underReview + verified + rejected + suspended + unverifiedUpdates + updatesUnderReview + updatesRejected,
            }
    } catch (error) {
        console.error('Error fetching CA profile counts:', error);
        error.message = error.message || 'Failed to fetch counts';
        throw error;
    }
}

exports.listCAProfiles = async (tab, page, limit) => {
    const skip = (page - 1) * limit;
    const take = Number(limit);

    const whereClause = getWhereClause(tab);
    if (!whereClause) {
        const error = new Error('Invalid tab');
        error.statusCode = 400;
        throw error;
    }

    const includeClause = getIncludeClause(tab);
    const selectClause = getSelectClause(tab);

    const [profiles, total] = await Promise.all([
        prisma.cAProfile.findMany({
            where: whereClause, skip, take,
            ...(selectClause ? { select: selectClause } : { include: includeClause }),
            orderBy: { updatedAt: 'desc' },
        }),
        prisma.cAProfile.count({ where: whereClause }),
    ]);
    
    // Collect all fileKeys from documents
    const fileKeysMap = new Map(); // Map to track fileKey -> document objects
    const fileKeys = [];

    profiles.forEach(profile => {
        if (profile.documents && Array.isArray(profile.documents)) {
            profile.documents.forEach(doc => {
                if (doc.fileKey && !fileKeysMap.has(doc.fileKey)) {
                    fileKeys.push(doc.fileKey);
                    fileKeysMap.set(doc.fileKey, []);
                }
                fileKeysMap.get(doc.fileKey).push(doc);
            });
        }
    });

    //Collect fileKeys from pending profiles if applicable
    const pendingFileKeys = [];
    profiles.forEach(profile => {
        if (profile.pendingProfile && profile.pendingProfile.documents && Array.isArray(profile.pendingProfile.documents)) {
            profile.pendingProfile.documents.forEach(doc => {
                if (doc.fileKey && !fileKeysMap.has(doc.fileKey)) {
                    pendingFileKeys.push(doc.fileKey);
                    fileKeysMap.set(doc.fileKey, []);
                }
                fileKeysMap.get(doc.fileKey).push(doc);
            });
        }
    });

    // Get signed URLs for all fileKeys
    if (fileKeys.length > 0 || pendingFileKeys.length > 0) {
        const allFileKeys = [...fileKeys, ...pendingFileKeys];
        const signedUrlsMap = await storageService.getSignedUrls(allFileKeys);

        // Append signedUrl to each document
        profiles.forEach(profile => {
            if (profile.documents && Array.isArray(profile.documents)) {
                profile.documents.forEach(doc => {
                    if (doc.fileKey && signedUrlsMap[doc.fileKey]) {
                        doc.signedUrl = signedUrlsMap[doc.fileKey];
                    }
                });
            }
        });
        profiles.forEach(profile => {
            if (profile.pendingProfile && profile.pendingProfile.documents && Array.isArray(profile.pendingProfile.documents)) {
                profile.pendingProfile.documents.forEach(doc => {
                    if (doc.fileKey && signedUrlsMap[doc.fileKey]) {
                        doc.signedUrl = signedUrlsMap[doc.fileKey];
                    }
                });
            }
        });
    }

    return {
        profiles: profiles.map(removeNullFromPendingProfile),
        total,
        page: Number(page),
        limit: take,
        totalPages: Math.ceil(total / take)
    };
}

exports.suspendCAProfile = async (caProfileId, comment) => {
    return prisma.cAProfile.update({
        where: { id: caProfileId },
        data: { status: 'SUSPENDED', comment: comment || "Profile suspended by admin" }
    });
};


function removeNullFromPendingProfile(profile) {
    if (!profile.pendingProfile) return profile;
    
    return {
        ...profile,
        pendingProfile: Object.fromEntries(
            Object.entries(profile.pendingProfile).filter(([_, value]) => {
                if (value === null || value === undefined) return false;
                if (Array.isArray(value) && value.length === 0) return false;
                return true;
            })
        )
    };
}

function getWhereClause(tab) {
  switch (tab) {
    case 'unverified':         return { status: 'PENDING', pendingProfile: null };
    case 'underReview':        return { status: 'UNDER_REVIEW', pendingProfile: null };
    case 'verified':           return { status: 'APPROVED', pendingProfile: null };
    case 'rejected':           return { status: 'REJECTED', pendingProfile: null };
    case 'suspended':          return { status: 'SUSPENDED' };
    case 'unverifiedUpdates':  return { status: 'APPROVED', pendingProfile: { status: 'PENDING' } };
    case 'updatesUnderReview': return { status: 'APPROVED', pendingProfile: { status: 'UNDER_REVIEW' } };
    case 'updatesRejected':    return { status: 'APPROVED', pendingProfile: { status: 'REJECTED' } };
    default: return null;
  }
}

function getIncludeClause(tab) {
  const base = { user: { select: { name: true, email: true, phone: true } },
                 documents: true };
  if (['updatesUnderReview', 'updatesRejected', 'unverifiedUpdates'].includes(tab)) {
    return { ...base, pendingProfile: { include: { documents: true } } };
  }
  return base;
}

function getSelectClause(tab) {
  if (tab === 'unverified') {
    return {
      id: true, createdAt: true,
      user: { select: { name: true, email: true, phone: true } },
    };
  }
  return null;
}
