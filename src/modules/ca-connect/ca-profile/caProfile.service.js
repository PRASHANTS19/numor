const { mime } = require('zod');
const prisma = require('../../../config/database');
const storageService = require('../../../storage/storage.service');

exports.listApprovedCAs = async () => {
  return prisma.cAProfile.findMany({
    where: { status: 'APPROVED' },
    select: {
      id: true,
      experienceYears: true,
      hourlyFee: true,
      ratingAvg: true,
      ratingCount: true,
      specializations: true,
      languages: true,
      user: {
        select: {
          name: true
        }
      }
    }
  });
};

exports.getByUserId = async (user) => {

  const profile = await prisma.cAProfile.findUnique({
    where: { userId: user.userId },
    include: {
      pendingProfile: true
    }
  });

  if (!profile) {
    throw new Error("CA profile not found");
  }

  const pending = profile.pendingProfile || null;

  let pendingChanges = null;

  if (pending) {

    const {
      id,
      caProfileId,
      createdAt,
      updatedAt,
      status,
      comment,
      ...fields
    } = pending;

    pendingChanges = {
      ...filterValidFields(fields),
      status,
      comment
    };
  }

  const { pendingProfile, ...approvedProfile } = profile;

  return {
    currentProfile: approvedProfile,
    pendingProfile: pendingChanges
  };
};
exports.createProfile = async (user, data) => {
  const existing = await prisma.cAProfile.findUnique({
    where: { userId: user.userId }
  });

  if (existing) {
    throw new Error('CA profile already exists');
  }

  return prisma.cAProfile.create({
    data: {
      ...data,
      userId: user.userId,
      status: 'PENDING'
    }
  });
};

exports.updateProfile = async (user, data) => {

  const filteredData = filterValidFields(data);

  const profile = await prisma.cAProfile.findUnique({
    where: { userId: user.userId }
  });

  // first time
  if (!profile) {
    return prisma.cAProfile.create({
      data: {
        userId: user.userId,
        ...filteredData
      }
    });
  }

  if (profile.status === "SUSPENDED") {
    throw new Error("Profile is suspended, cannot update");
  }

  // if still pending
  if (profile.status !== "APPROVED") {
    return prisma.cAProfile.update({
      where: { userId: user.userId },
      data: { ...filteredData, status: "PENDING" },
    });
  }

  // if already approved → save changes to pending
  return prisma.cAProfilePending.upsert({
    where: { caProfileId: profile.id },
    update: {
      ...filteredData,
      status: "PENDING",   // reset status when CA resubmits
      comment: null             // optional: clear admin rejection comment
    },
    create: {
      caProfileId: profile.id,
      ...filteredData,
      status: "PENDING"
    }
  });
};

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

exports.deleteProfile = async (user) => {
  const existing = await prisma.cAProfile.findUnique({
    where: { userId: user.userId }
  });

  if (!existing) {
    throw new Error('CA profile not found');
  }

  return prisma.cAProfile.delete({
    where: { userId: user.userId }
  });
};

exports.uploadDocument = async (user, file, type, description) => {

  const caProfile = await prisma.cAProfile.findUnique({
    where: { userId: user.userId }
  });

  if (!caProfile) {
    throw new Error("CA profile not found");
  }
  if (caProfile.status === "SUSPENDED") {
    throw new Error("Profile is suspended, cannot update");
  }
  const fileBuffer = file.buffer;
  const mimeType = file.mimetype;

  let fileKey;

  switch (type) {

    case "CERTIFICATION":
      fileKey = `ca/certificates/${user.userId}/${Date.now()}-${file.originalname}`;
      break;

    case "ID_PROOF":
      fileKey = `ca/id-proofs/${user.userId}/${Date.now()}-${file.originalname}`;
      break;

    default:
      throw new Error("Invalid upload type");
  }

  await storageService.upload(fileKey, fileBuffer, mimeType);

  // If CA already approved → save to pending
  if (caProfile.status === "APPROVED") {

    const pending = await prisma.cAProfilePending.upsert({
      where: { caProfileId: caProfile.id },
      update: {
        status: "PENDING",
        comment: null
      },
      create: {
        caProfileId: caProfile.id,
        status: "PENDING",
        comment: null
      }
    });

    const document = await prisma.cADocumentPending.create({
      data: {
        pendingId: pending.id,
        type,
        description,
        fileKey,
        mimeType
      }
    });

    const url = await storageService.getSignedUrl(fileKey);
    console.log("Uploaded document for approved CA, saved to pending", { documentId: document.id, pendingId: pending.id });
    return {
      id: document.id,
      status: "PENDING_APPROVAL",
      url
    };
  }

  // If profile still pending → save directly
  await prisma.cAProfile.update({
    where: { userId: user.userId },
    data: { status: "PENDING" },
  });

  const document = await prisma.cADocument.create({
    data: {
      caProfileId: caProfile.id,
      type,
      description,
      fileKey,
      mimeType
    }
  });

  const url = await storageService.getSignedUrl(fileKey);

  return {
    id: document.id,
    status: "UPLOADED",
    type: document.type,
    description: document.description,
    mimeType: document.mimeType,
    url
  };
};

exports.submitPendingProfile = async (user) => {

  const profile = await prisma.cAProfile.findUnique({
    where: { userId: user.userId }
  });

  if (!profile) {
    throw new Error("CA profile not found");
  }

  /**
   * CASE 1
   * First time profile submission
   */
  if (profile.status === "PENDING") {

    return prisma.cAProfile.update({
      where: { id: profile.id },
      data: {
        status: "UNDER_REVIEW"
      }
    });
  }

  /**
   * CASE 2
   * Approved CA updating profile
   */
  if (profile.status === "APPROVED") {

    const pendingProfile = await prisma.cAProfilePending.findUnique({
      where: { caProfileId: profile.id }
    });

    if (!pendingProfile) {
      throw new Error("No pending changes found");
    }

    if (pendingProfile.status !== "PENDING") {
      throw new Error("Profile already submitted for review or is in rejected state");
    }

    return prisma.cAProfilePending.update({
      where: { caProfileId: profile.id },
      data: {
        status: "UNDER_REVIEW"
      }
    });
  }

  /**
   * CASE 3
   * Profile already under review
   */
  if (profile.status === "UNDER_REVIEW") {
    throw new Error("Profile is already under review");
  }

  throw new Error("Invalid profile state");
};

exports.getDocuments = async (user) => {
  const caProfile = await prisma.cAProfile.findUnique({
    where: { userId: user.userId },
    include: {
      documents: true,
      pendingProfile: {
        include: {
          documents: true
        }
      }
    }
  });

  if (!caProfile) {
    throw new Error("CA profile not found");
  }

  const pending = caProfile.pendingProfile || null;

  // Step 1: Group base documents by type (array)
  const docMap = new Map();

  for (const doc of caProfile.documents) {
    if (!docMap.has(doc.type)) {
      docMap.set(doc.type, []);
    }

    docMap.get(doc.type).push({
      id: doc.id,
      type: doc.type,
      description: doc.description,
      mimeType: doc.mimeType,
      fileKey: doc.fileKey,
      source: "BASE"
    });
  }

  // Step 2: Apply pending operations
  if (pending && pending.documents?.length) {
    for (const pDoc of pending.documents) {
      const key = pDoc.type;

      // ✅ DELETE → remove only matching fileKey
      if (pDoc.operation === "DELETE") {
        if (docMap.has(key)) {
          const filtered = docMap
            .get(key)
            .filter(d => d.fileKey !== pDoc.fileKey);

          if (filtered.length > 0) {
            docMap.set(key, filtered);
          } else {
            docMap.delete(key);
          }
        }
      }

      // ✅ ADD → append new doc
      else if (pDoc.operation === "ADD") {
        if (!docMap.has(key)) {
          docMap.set(key, []);
        }

        docMap.get(key).push({
          id: pDoc.id,
          type: pDoc.type,
          description: pDoc.description,
          mimeType: pDoc.mimeType,
          fileKey: pDoc.fileKey,
          source: "PENDING"
        });
      }

      // (Optional) UPDATE handling can be added here later
    }
  }

  // Step 3: Flatten all documents
  const allDocs = Array.from(docMap.values()).flat();

  // Step 4: Generate signed URLs
  const documents = await Promise.all(
    allDocs.map(async (doc) => {
      const url = await storageService.getSignedUrl(doc.fileKey);

      return {
        id: doc.id,
        type: doc.type,
        description: doc.description,
        mimeType: doc.mimeType,
        url,
        source: doc.source,
        fileKey: doc.fileKey,
      };
    })
  );

  return {
    documents
  };
};

exports.deleteDocument = async (user, fileKey) => {

  const userId = BigInt(user.userId);

  const caProfile = await prisma.cAProfile.findUnique({
    where: { userId }
  });

  if (!caProfile) {
    throw new Error("CA profile not found");
  }

  if (caProfile.status === "SUSPENDED") {
    throw new Error("Profile is suspended, cannot update");
  }

  // =========================================================
  // ✅ CASE 1: APPROVED → Pending flow
  // =========================================================
  if (caProfile.status === "APPROVED") {
    // 🔹 Step 1: get pending (NO mutation)
    let pending = await prisma.cAProfilePending.findUnique({
      where: { caProfileId: caProfile.id }
    });

    // 🔹 Step 2: check existing operation
    if (pending) {
      const existingPendingDoc = await prisma.cADocumentPending.findFirst({
        where: {
          pendingId: pending.id,
          fileKey
        }
      });

      if (existingPendingDoc) {
        if (existingPendingDoc.operation === "DELETE") {
          // ❌ No state change should happen
          throw new Error("Delete already requested");
        }
        if (existingPendingDoc.operation === "ADD") {
          await storageService.remove(fileKey);
          await prisma.cADocumentPending.delete({
            where: { id: existingPendingDoc.id }
          });
          await prisma.cAProfilePending.update({
            where: { caProfileId: caProfile.id },
            data: {
              status: "PENDING",
              comment: null
            }
          });
          return {
            message: "Pending document removed successfully"
          };
        }
      }
    }

    // 🔹 Step 3: check main doc
    const document = await prisma.cADocument.findFirst({
      where: {
        fileKey,
        caProfileId: caProfile.id
      }
    });

    if (!document) {
      throw new Error("Document not found");
    }

    // 🔹 Step 4: NOW create/update pending safely
    pending = await prisma.cAProfilePending.upsert({
      where: { caProfileId: caProfile.id },
      update: {
        status: "PENDING",
        comment: null
      },
      create: {
        caProfileId: caProfile.id,
        status: "PENDING",
        comment: null
      }
    });

    // 🔹 Step 5: create DELETE request
    await prisma.cADocumentPending.create({
      data: {
        pendingId: pending.id,
        type: document.type,
        fileKey: document.fileKey,
        mimeType: document.mimeType,
        description: document.description,
        operation: "DELETE"
      }
    });

    return {
      message: "Delete request submitted",
      status: "PENDING"
    };
  }
  // =========================================================
  // ✅ CASE 2: PENDING / UNDER_REVIEW / REJECTED → Direct delete from MAIN means CA profile is not approved yet, so we can directly delete the document without pending flow
  // =========================================================

  // 🔹Delete from MAIN
  const document = await prisma.cADocument.findFirst({
    where: {
      fileKey,
      caProfileId: caProfile.id
    }
  });

  if (!document) {
    throw new Error("Document not found");
  }

  await storageService.remove(fileKey);

  await prisma.cADocument.delete({
    where: { id: document.id }
  });
  await prisma.cAProfile.update({
    where: { userId: user.userId }
    , data: { status: "PENDING", comment: null }
  });

  return {
    message: "Document deleted successfully"
  };
};

// exports.uploadCertificate = async (user, file) => {

//   const caProfile = await prisma.cAProfile.findUnique({
//     where: { userId: user.userId }
//   });
//   if (!caProfile) {
//     throw new Error("CA profile not found");
//   }
//   const fileBuffer = file.buffer;
//   const fileKey = `ca-certificates/${user.userId}/${Date.now()}-${file.originalname}`;
//   await storageService.upload(fileKey, fileBuffer, file.mimetype);
//   return prisma.cADocument.create({
//     data: {
//       caProfileId: caProfile.id,
//       type: "CERTIFICATION",
//       fileKey
//     }
//   });
// };

// exports.uploadIdProof = async (user, file) => {
//   const caProfile = await prisma.cAProfile.findUnique({
//     where: { userId: user.userId }
//   });
//   if (!caProfile) {
//     throw new Error("CA profile not found");
//   }
//   const fileBuffer = file.buffer;
//   const fileKey = `ca-id-proofs/${user.userId}/${Date.now()}-${file.originalname}`;
//   await storageService.upload(fileKey, fileBuffer, file.mimetype);
//   return prisma.cADocument.create({
//     data: {
//       caProfileId: caProfile.id,
//       type: "ID_PROOF",
//       fileKey
//     }
//   });
// };