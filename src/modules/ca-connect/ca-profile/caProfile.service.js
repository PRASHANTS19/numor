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

exports.uploadDocument = async (user, file, type) => {

  const caProfile = await prisma.cAProfile.findUnique({
    where: { userId: user.userId }
  });
  if (!caProfile) {
    throw new Error("CA profile not found");
  }
  const fileBuffer = file.buffer;
  let fileKey;
  switch (type) {
    case "PROFILE_PHOTO":
      const allowedImageTypes = [
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/webp",
        "image/jfif"
      ];

      if (!allowedImageTypes.includes(file.mimetype)) {
        throw new Error("Profile photo must be PNG, JPG, JPEG, WEBP or JFIF");
      }

      fileKey = `ca/profile-photo/${user.userId}/${Date.now()}-${file.originalname}`;
      await storageService.upload(fileKey, fileBuffer, file.mimetype);
      await prisma.cAProfile.update({
        where: { userId: user.userId },
        data: {
          profilePhotoKey: fileKey
        }
      });
      return { type, fileKey };

    case "CERTIFICATION":
      fileKey = `ca/certificates/${user.userId}/${Date.now()}-${file.originalname}`;
      await storageService.upload(fileKey, fileBuffer, file.mimetype);
      return prisma.cADocument.create({
        data: {
          caProfileId: caProfile.id,
          type: "CERTIFICATION",
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

  let profilePhoto = null;

  if (caProfile.profilePhotoKey) {
    const url = await storageService.getSignedUrl(caProfile.profilePhotoKey);

    profilePhoto = {
      type: "PROFILE_PHOTO",
      url
    };
  }

  const documents = await Promise.all(
    caProfile.documents.map(async (doc) => {
      const url = await storageService.getSignedUrl(doc.fileKey);

      return {
        id: doc.id,
        type: doc.type,
        url
      };
    })
  );

  return {
    profilePhoto,
    documents
  };
};

// exports.uploadProfilePhoto = async (user, file) => {
//   const existing = await prisma.cAProfile.findUnique({
//     where: { userId: user.userId }
//   });

//   if (existing?.profilePhotoKey) {
//     await storageService.remove(existing.profilePhotoKey);
//   }
//   const fileBuffer = file.buffer;
//   const fileKey = `ca-profile-photos/${user.userId}/${Date.now()}-${file.originalname}`;
//   await storageService.upload(fileKey, fileBuffer, file.mimetype);
//   await prisma.cAProfile.update({
//     where: { userId: user.userId },
//     data: {
//       profilePhotoKey: fileKey
//     }
//   });

//   return { fileKey };
// };

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