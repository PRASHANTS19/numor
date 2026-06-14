const prisma = require("../../config/database");
const storageService = require('../../storage/storage.service');

async function getById(orgId) {
  return prisma.organization.findUnique({
    where: { id: BigInt(orgId) },
    include: {
      customFieldDefinitions: {
        select: {
          id: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });
}

async function update(orgId, data) {
  return prisma.organization.update({
    where: { id: BigInt(orgId) },
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,

      streetAddress: data.streetAddress ?? data.address?.streetAddress ?? null,
      city: data.city ?? data.address?.city ?? null,
      state: data.state ?? data.address?.state ?? null,
      zipCode: data.zipCode ?? data.address?.zipCode ?? null,
      country: data.country ?? null,

      taxId: data.taxId ?? null,
      logoUrl: data.logoUrl ?? null,

      isActive: data.isActive ?? undefined,
    },
  });
}

async function uploadLogo(user, file) {
  const existing = await prisma.organization.findUnique({
    where: { id: BigInt(user.orgId) },
    select: { logoUrl: true }
  });

  if (existing?.logoUrl) {
    await storageService.remove(existing.logoUrl);
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

  fileKey = `organization/org-logo/${user.orgId}/${Date.now()}-${file.originalname}`;
  const fileBuffer = file.buffer;

  await storageService.upload(fileKey, fileBuffer, file.mimetype);
  await prisma.organization.update({
    where: { id: user.orgId },
    data: {
      logoUrl: fileKey
    }
  });
    // generate signed URL
  const signedUrl = await storageService.getSignedUrl(fileKey);

  return signedUrl;

};

async function getLogo(user) {

  const dbUser = await prisma.organization.findUnique({
    where: { id: BigInt(user.orgId) },
    select: { logoUrl: true }
  });

  if (!dbUser || !dbUser.logoUrl) {
    return { logoUrl: null };
  }

  const url = await storageService.getSignedUrl(dbUser.logoUrl);

  return url;
};

async function deleteLogo(user) {

  const dbUser = await prisma.organization.findUnique({
    where: { id: BigInt(user.orgId) },
    select: { logoUrl: true }
  });

  if (dbUser && dbUser.logoUrl) {
    await storageService.remove(dbUser.logoUrl);
    await prisma.organization.update({
      where: { id: BigInt(user.orgId) },
      data: { logoUrl: null }
    });
  }
}

module.exports = {
  getById,
  update,
  uploadLogo,
  getLogo,
  deleteLogo
};
