const service = require('./user.service');
const { sendResponse } = require('../../utils/response');

exports.createUser = async (req, res, next) => {
    try{
        const result = await service.createUser(req.user, req.body);
        return sendResponse(res, 201, { data: result });
    }
    catch(err){
        next(err);
    }
};

exports.listUsers = async (req, res, next) => {
    try {
        const {page, limit} = req.query;
        const users = await service.listUsers(req.user, Number(page), Number(limit));
        return sendResponse(res, 200, { data: users });
    } catch (err) {
        next(err);
    }
};

exports.getUser = async (req, res, next) => {
    try {
        const user = await service.getUser(req.user, req.params.id);
        return sendResponse(res, 200, { data: user });
    } catch (err) {
        next(err);
    }
};

exports.updateUser = async (req, res, next) => {
    try {
        const user = req.user;
        const userresponse = await service.updateUser(user, req.body);
        return sendResponse(res, 200, { data: userresponse });
    } catch (err) {
        next(err);
    }
};

exports.updateUserStatus = async (req, res, next) => {
    try {
        const user = await service.updateUserStatus(
            req.user,
            req.params.id,
            req.body.isActive
        );
        return sendResponse(res, 200, { data: user });
    } catch (err) {
        next(err);
    }
};

exports.getCurrentUser = async (req, res, next) => {
    console.log('Fetching current user for:', req.user);
    try {
        const user = await service.getUser(req.user, req.user.userId);
        return sendResponse(res, 200, { data: user });
    } catch (err) {
        next(err);
    }

};

exports.uploadProfilePhoto = async (req, res, next) => {
  try {
    const user = req.user;
    const file = req.file;
    const profilePhotoUrl = await service.uploadProfilePhoto(user, file);
    return sendResponse(res, 200, { data: { profilePhotoUrl } });
  } catch (err) {
    next(err);
  }
};

exports.getProfilePhoto = async (req, res, next) => {
  try {
    const user = req.user;
    const photoUrl = await service.getProfilePhoto(user);
    return sendResponse(res, 200, { data: { photoUrl } });
  } catch (err) {
    next(err);
  }
}

exports.deleteProfilePhoto = async (req, res, next) => {
  try {
    const user = req.user;
    await service.deleteProfilePhoto(user);
    return sendResponse(res, 200, { message: "Profile photo deleted successfully" });
  } catch (err) {
    next(err);
  }
}

exports.inviteNewUser = async (req, res, next) => {

  const { email, organizationId, permissions } = req.body;

  if (!email || !organizationId || !permissions) {
    const error = new Error('Missing required parameters');
    error.statusCode = 400;
    return next(error);
  }

  try {
    const result = await service.inviteNewUser(email, organizationId, permissions);
    return sendResponse(res, 200, {
      success: result.success,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }


}


exports.saveWidgets = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { widgets } = req.body;

    const data = await service.saveWidgets(userId, widgets);

    return sendResponse(res, 200, {
      data
    });
  } catch (err) {
    next(err);
  }
};


exports.deleteWidget = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const widgetName = req.query.widgetName || req.query.name || req.query.widgetId;

    console.log('Deleting widget for user:', userId, 'Widget name:', widgetName);

    const data = await service.deleteWidget(userId, widgetName);

    return sendResponse(res, 200, {
      data
    });
  } catch (err) {
    next(err);
  }
};
