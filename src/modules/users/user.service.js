const bcrypt = require('bcrypt');
const crypto = require('crypto');
const prisma = require('../../config/database');
const storageService = require('../../storage/storage.service');
const emailService = require('../../services/email.service');

exports.createUser = async (admin, data) => {
  const { email, name, userType, password } = data;
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
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
    where: { orgId: admin.orgId },
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

exports.getUser = async (admin, userId) => {
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
      role: true,
      widgets: true,
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
    }
  });
  if (!user) throw new Error('User not found');
  return user;
}


exports.updateUser = async (user, data) => {
  const updateUser = { ...data };

  if (data.password) {
    updateUser.passwordHash = await bcrypt.hash(data.password, 10);
    delete updateUser.password;
  }

  return prisma.user.update({
    where: {
      id: BigInt(user.userId),
    },
    data: updateUser,
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

exports.inviteNewUser = async (email, organizationId, permissions) => {

  const token = crypto.randomBytes(32).toString('hex'); // 1. Generate a cryptographically secure random token

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  try{
    const invitation = await prisma.userInvitation.upsert({
      where: { email },
      update: {
        token,
        permissions,
        expiresAt,
        createdAt: new Date()
      },
      create: {
        email,
        organizationId: BigInt(organizationId),
        token,
        permissions,
        expiresAt
      }
    });

    const frontendUrl = process.env.FRONTEND_URL || 'https://numor.app';
    const magicLink = `${frontendUrl}/accept-invitation?token=${invitation.token}`;

    const subject = "You've been invited to join Numor";
    const html = `
      <p>Hi,</p>
      <p>You have been invited to join <strong>Numor</strong>.</p>
      <p>Click the link below to accept the invitation and set up your account:</p>
      <p><a href="${magicLink}">Accept Invitation</a></p>
      <br/>
      <p>
        Thanks,<br/>
        <strong>Team Numor</strong><br/>
        <a href="https://numor.app">https://numor.app</a>
      </p>
    `;
    // const text = `
    //   Hi,
    //   You have been invited to join Numor.
    //   Click the link below to accept the invitation and set up your account:
    //   ${magicLink}
    //   Thanks,
    //   Team Numor
    //   https://numor.app
    // `;
    await emailService.sendEmail(invitation.email, subject, html);

    return {
      success : true,
      message: "Invitation sent successfully"
    };
    
    
  }
  catch (err) {
    console.error('Error creating/updating user invitation:', err);
    throw new Error('Failed to create user invitation');
  }
}

const ALLOWED_WIDGET_NAMES = new Set([
  "revenue_vs_time",
  "expense_vs_time",
  "cashflow_vs_time",
  "income_expense_vs_time",
  "client_vs_revenue",
  "invoice_status_wise_breakdown",
  "expense_category_wise_breakdown",
]);

exports.saveWidgets = async (userId, widgets) => {
  if (!Array.isArray(widgets)) {
    throw new Error('widgets must be an array');
  }

  const user = await prisma.user.findUnique({
    where: { id: BigInt(userId) },
    select: { widgets: true }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // const existingWidgets = Array.isArray(user.widgets) ? user.widgets : [];
  // const widgetSet = new Set();

  // existingWidgets.forEach((name) => {
  //   if (typeof name === "string" && ALLOWED_WIDGET_NAMES.has(name)) {
  //     widgetSet.add(name);
  //   }
  // });

  // widgets.forEach((item) => {
  //   const name = typeof item === "string" ? item.trim() : "";

  //   if (!name) {
  //     throw new Error("Each widget must be a non-empty string");
  //   }

  //   if (!ALLOWED_WIDGET_NAMES.has(name)) {
  //     throw new Error(`Invalid widget name: ${name}`);
  //   }

  //   widgetSet.add(name);
  // });

  const updatedWidgets = Array.from(widgets);

  await prisma.user.update({
    where: { id: BigInt(userId) },
    data: { widgets: updatedWidgets }
  });

  return updatedWidgets;
};

exports.deleteWidget = async (userId, widgetName) => {
  if (!widgetName || typeof widgetName !== "string") {
    throw new Error('widgetName is required');
  }
  const name = widgetName.trim();
  if (!name) {
    throw new Error('widgetName is required');
  }
  if (!ALLOWED_WIDGET_NAMES.has(name)) {
    throw new Error(`Invalid widget name: ${name}`);
  }
  const user = await prisma.user.findUnique({
    where: { id: BigInt(userId) },
    select: { widgets: true }
  });
  if (!user) {
    throw new Error('User not found');
  }

  const existingWidgets = Array.isArray(user.widgets) ? user.widgets : [];
  const widgetExists = existingWidgets.includes(name);

  if (!widgetExists) {
    throw new Error('Widget not found');
  }

  const updatedWidgets = existingWidgets.filter((w) => w !== name);

  await prisma.user.update({
    where: { id: BigInt(userId) },
    data: { widgets: updatedWidgets }
  });

  return updatedWidgets;
};

