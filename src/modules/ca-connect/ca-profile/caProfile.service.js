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
  return prisma.cAProfile.findUnique({
    where: { userId: user.userId }
  });
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

  // if still pending
  if (profile.status !== "APPROVED") {
    return prisma.cAProfile.update({
      where: { userId: user.userId },
      data: filteredData
    });
  }

  // if already approved → save changes to pending
  return prisma.cAProfilePending.upsert({
    where: { caProfileId: profile.id },
    update: {
      ...filteredData,
      status: "UNDER_REVIEW",   // reset status when CA resubmits
      comment: null             // optional: clear admin rejection comment
    },
    create: {
      caProfileId: profile.id,
      ...filteredData,
      status: "UNDER_REVIEW"
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
      update: {},
      create: {
        caProfileId: caProfile.id
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
exports.getDocuments = async (user) => {
  const caProfile = await prisma.cAProfile.findUnique({
    where: { userId: user.userId },
    include: {
      documents: true
    }
  });

  if (!caProfile) {
    throw new Error("CA profile not found");
  }

  const documents = await Promise.all(
    caProfile.documents.map(async (doc) => {
      const url = await storageService.getSignedUrl(doc.fileKey);

      return {
        id: doc.id,
        type: doc.type,
        description: doc.description,
        mimeType: doc.mimeType,
        url
      };
    })
  );

  return {
    documents
  };
};

exports.deleteDocument = async (user, documentId) => {
  console.log("Deleting document", { userId: user.userId, documentId });
  const document = await prisma.cADocument.findFirst({
    where: {
      id: BigInt(documentId),
      caProfile: {
        userId: BigInt(user.userId)
      }
    }
  });

  if (!document) {
    throw new Error("Document not found or unauthorized");
  }

  // delete file from storage
  await storageService.remove(document.fileKey);

  // delete DB record
  await prisma.cADocument.delete({
    where: {
      id: BigInt(documentId)
    }
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