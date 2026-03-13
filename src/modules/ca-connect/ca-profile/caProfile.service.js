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
  return prisma.cAProfile.upsert({
    where: {
      userId: user.userId
    },
    update: {
      ...data
    },
    create: {
      userId: user.userId,
      ...data
    }
  });
};

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
  let fileKey;
  switch (type) {
    case "CERTIFICATION":
      fileKey = `ca/certificates/${user.userId}/${Date.now()}-${file.originalname}`;
      await storageService.upload(fileKey, fileBuffer, file.mimetype);
      return prisma.cADocument.create({
        data: {
          caProfileId: caProfile.id,
          type: "CERTIFICATION",
          description,
          fileKey
        }
      });

    case "ID_PROOF":
      fileKey = `ca/id-proofs/${user.userId}/${Date.now()}-${file.originalname}`;
      await storageService.upload(fileKey, fileBuffer, file.mimetype);
      return prisma.cADocument.create({
        data: {
          caProfileId: caProfile.id,
          type: "ID_PROOF",
          description,
          fileKey
        }
      });

    default:
      throw new Error("Invalid upload type");
  }
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
        url
      };
    })
  );

  return {
    documents
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