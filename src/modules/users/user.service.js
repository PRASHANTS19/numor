const bcrypt = require('bcrypt');
const prisma = require('../../config/database');
const storageService = require('../../storage/storage.service');

exports.createUser = async (admin, data)=>{
    const {email, name, userType, password} = data;
    const exists = await prisma.user.findUnique({where: {email}});
    if(exists){
        throw new Error('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    return prisma.user.create({
        data: {
            orgId: admin.orgId,
            email,
            name,
            userType,
            passwordHash,
        },
        select: {
            id: true,
            email: true,
            name: true,
            userType: true,
            isActive: true,
            createdAt: true,
        }
    })
}

exports.listUsers = async (admin, page, limit) => {
    const offset = (page - 1) * limit;
    return prisma.user.findMany({
        where: {orgId: admin.orgId},
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            email: true,
            name: true,
            userType: true,
            isActive: true,
            createdAt: true,
        }
    });
}

exports.getUser = async (admin, userId)=>{
    const user = await prisma.user.findFirst({
        where: {
            id: BigInt(userId),
            orgId: admin.orgId,
        },
        select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            userType: true,
            isActive: true,
            createdAt: true,
            role: true
        }
    });
    if (!user) throw new Error('User not found');
    return user;
}


exports.updateUser = async (user, data) => {
    const updateUser = {...data};

    if(data.password){
        updateUser.passwordHash = await bcrypt.hash(data.password, 10);
        delete updateUser.password;
    }

    return prisma.user.update({
        where: {
            id: BigInt(user.userId),
        },
        data:updateUser,
    });
};

exports.updateUserStatus = async (admin, userId, isActive) => {
    return prisma.user.updateMany({
        where: {
            id: BigInt(userId),
            orgId: admin.orgId,
        },
        data: { isActive },
    });
};

exports.uploadProfilePhoto = async (user, file) => {
  const existing = await prisma.user.findUnique({
    where: { id: BigInt(user.userId) },
    select: { profilePhotoKey: true }
  });

  if (existing?.profilePhotoKey) {
    await storageService.remove(existing.profilePhotoKey);
  }
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

  fileKey = `user/profile-photo/${user.userId}/${Date.now()}-${file.originalname}`;
  const fileBuffer = file.buffer;

  await storageService.upload(fileKey, fileBuffer, file.mimetype);
  await prisma.user.update({
    where: { id: user.userId },
    data: {
      profilePhotoKey: fileKey
    }
  });
    // generate signed URL
  const signedUrl = await storageService.getSignedUrl(fileKey);

  return signedUrl;

};

exports.getProfilePhoto = async (user) => {

  const dbUser = await prisma.user.findUnique({
    where: { id: BigInt(user.userId) },
    select: { profilePhotoKey: true }
  });

  if (!dbUser || !dbUser.profilePhotoKey) {
    return { profilePhoto: null };
  }

  const url = await storageService.getSignedUrl(dbUser.profilePhotoKey);

  return url;
};

exports.deleteProfilePhoto = async (user) => {
  const dbUser = await prisma.user.findUnique({
    where: { id: BigInt(user.userId) },
    select: { profilePhotoKey: true }
  });
  console.log('Deleting profile photo for user:', user.userId, 'Photo key:', dbUser);
  if (!dbUser || !dbUser.profilePhotoKey) {
    throw new Error("No profile photo to delete");
  }

  await storageService.remove(dbUser.profilePhotoKey);

  await prisma.user.update({
    where: { id: BigInt(user.userId) },
    data: { profilePhotoKey: null }
  });

};