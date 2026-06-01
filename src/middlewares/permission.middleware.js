const prisma = require('../config/database');

const FULL_ACCESS_ROLES = new Set(['ADMIN', 'CA_USER']);

async function getAuthorizationUser(req) {
  if (req.authorizationUser) {
    return req.authorizationUser;
  }

  if (!req.user?.userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: BigInt(req.user.userId) },
    select: {
      id: true,
      role: true,
      isOrgOwner: true,
      permissions: true,
      isActive: true,
    },
  });

  req.authorizationUser = user;
  return user;
}

function deny(next, message = 'Permission denied') {
  const error = new Error(message);
  error.statusCode = 403;
  return next(error);
}

function requirePermission(resource, action) {
  return async (req, res, next) => {
    try {
      if (FULL_ACCESS_ROLES.has(req.user?.role)) {
        return next();
      }

      const user = await getAuthorizationUser(req);

      if (!user || !user.isActive) {
        return deny(next, 'User is inactive or not found');
      }

      if (FULL_ACCESS_ROLES.has(user.role) || user.isOrgOwner) {
        return next();
      }

      const resourcePermissions = user.permissions?.[resource];
      const allowed =
        resourcePermissions?.[action] === true ||
        (action === 'read' && resourcePermissions?.write === true);

      if (!allowed) {
        return deny(next);
      }

      return next();
    } catch (err) {
      return next(err);
    }
  };
}

function requireOrgOwner(req, res, next) {
  Promise.resolve()
    .then(async () => {
      if (req.user?.role === 'ADMIN') {
        return next();
      }

      const user = await getAuthorizationUser(req);

      if (!user || !user.isActive) {
        return deny(next, 'User is inactive or not found');
      }

      if (user.role === 'ADMIN' || user.isOrgOwner) {
        return next();
      }

      return deny(next, 'Only organization owners can perform this action');
    })
    .catch(next);
}

module.exports = {
  requirePermission,
  requireOrgOwner,
};
