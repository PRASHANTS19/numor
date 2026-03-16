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

      const documentsToInsert = pendingProfile.documents.map(doc => ({
        caProfileId,
        type: doc.type,
        fileKey: doc.fileKey,
        mimeType: doc.mimeType,
        description: doc.description
      }));

      await tx.CADocument.createMany({
        data: documentsToInsert
      });

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

  return prisma.$transaction(async (tx) => {

    // 1️⃣ find pending profile
    const pendingProfile = await tx.cAProfilePending.findUnique({
      where: { caProfileId },
      include: {
        documents: true
      }
    });

    if (!pendingProfile) {
      throw new Error("No pending profile update found");
    }

    // 2️⃣ update status and add admin comment
    const rejectedProfile = await tx.cAProfilePending.update({
      where: { id: pendingProfile.id },
      data: {
        status: "REJECTED",
        comment: comment || "Update rejected by admin"
      }
    });

    // 3️⃣ optionally delete uploaded pending documents
    if (pendingProfile.documents.length > 0) {
      await tx.cADocumentPending.deleteMany({
        where: {
          pendingId: pendingProfile.id
        }
      });
    }
    return rejectedProfile;
  });
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