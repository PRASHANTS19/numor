const service = require('./user.service');

exports.createUser = async (req, res, next) => {
    try{
        const result = await service.createUser(req.user, req.body);
        res.status(201).json({success: true, data: result});
    }
    catch(err){
        next(err);
    }
};

exports.listUsers = async (req, res, next) => {
    try {
        const {page, limit} = req.query;
        const users = await service.listUsers(req.user, Number(page), Number(limit));
        res.json({ success: true, data: users });
    } catch (err) {
        next(err);
    }
};

exports.getUser = async (req, res, next) => {
    try {
        const user = await service.getUser(req.user, req.params.id);
        res.json({ success: true, data: user });
    } catch (err) {
        next(err);
    }
};

exports.updateUser = async (req, res, next) => {
    try {
        const user = req.user;
        const userresponse = await service.updateUser(user, req.body);
        res.json({ success: true, data: userresponse });
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
        res.json({ success: true, data: user });
    } catch (err) {
        next(err);
    }
};

exports.getCurrentUser = async (req, res, next) => {
    console.log('Fetching current user for:', req.user);
    try {
        const user = await service.getUser(req.user, req.user.userId);
        res.json({ success: true, data: user });
    } catch (err) {
        next(err);
    }

};

exports.uploadProfilePhoto = async (req, res, next) => {
  try {
    const user = req.user;
    const file = req.file;
    const profilePhotoUrl = await service.uploadProfilePhoto(user, file);
    res.json({ success: true, profilePhotoUrl });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getProfilePhoto = async (req, res, next) => {
  try {
    const user = req.user;
    const photoUrl = await service.getProfilePhoto(user);
    res.json({ success: true, photoUrl });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

exports.deleteProfilePhoto = async (req, res, next) => {
  try {
    const user = req.user;
    await service.deleteProfilePhoto(user);
    res.json({ success: true, message: "Profile photo deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

exports.inviteNewUser = async (req, res, next) => {

  const { email, organizationId, permissions } = req.body;

  if (!email || !organizationId || !permissions) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const result = await service.inviteNewUser(email, organizationId, permissions);
    res.json({ success: result.success, message: result.message });
  } catch (err) {
    next(err);
  }


}

exports.pendingInvitations = async (req, res, next) => {
  try {
    const invitations = await service.listPendingInvitations(req.user.orgId);

    res.json({
      success: true,
      data: invitations,
    });
  } catch (err) {
    next(err);
  }
};


exports.saveWidgets = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { widgets } = req.body;

    const data = await service.saveWidgets(userId, widgets);

    res.json({
      success: true,
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

    res.json({
      success: true,
      data
    });
  } catch (err) {
    next(err);
  }
};
