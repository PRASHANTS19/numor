const { ca, fi } = require('zod/v4/locales');
const caProfileService = require('./caProfile.service');
const { sendResponse } = require('../../../utils/response');

exports.listCAs = async (req, res, next) => {
  try {
    const cas = await caProfileService.listApprovedCAs(req.query);
    return sendResponse(res, 200, { data: cas });
  } catch (err) {
    next(err);
  }
};

exports.getCAProfile = async (req, res, next) => {
  try {
    const user = req.user;
    const profile = await caProfileService.getByUserId(user);
    return sendResponse(res, 200, { data: profile });
  } catch (err) {
    next(err);
  }
};

exports.createCAProfile = async (req, res, next) => {
  try {
    const user = req.user;
    const payload = req.body;
    const profile = await caProfileService.createProfile(user, payload);
    return sendResponse(res, 201, { data: profile });
  } catch (err) {
    next(err);
  }
};

exports.updateCAProfile = async (req, res, next) => {
  try {
    const user = req.user;
    const payload = req.body;
    const profile = await caProfileService.updateProfile(
      user, payload
    );
    return sendResponse(res, 200, { data: profile });
  } catch (err) {
    next(err);
  }
};

exports.deleteCAProfile = async (req, res, next) => {
  try {
    const user = req.user;
    await caProfileService.deleteProfile(user);
    return sendResponse(res, 200, { message: 'CA profile deleted' });
  } catch (err) {
    next(err);
  }
};

exports.uploadDocument = async (req, res, next) => {
  try {
    const user = req.user;
    const file = req.file;
    const { type, description } = req.body;

    if (!file) {
      const error = new Error("File is required");
      error.statusCode = 400;
      throw error;
    }
    if (!type) {
      const error = new Error("Type is required");
      error.statusCode = 400;
      throw error;
    }
    if (!description) {
      const error = new Error("Name of document is required");
      error.statusCode = 400;
      throw error;
    }
    const result = await caProfileService.uploadDocument(user, file, type, description || ""); // Pass description or empty string if not provided
    return sendResponse(res, 200, {
      data: result
    });
  } catch (err) {
    next(err);
  }
};

exports.getDocuments = async (req, res, next) => {
  try {

    const user = req.user;

    const data = await caProfileService.getDocuments(user);

    return sendResponse(res, 200, {
      data
    });

  } catch (err) {
    next(err);
  }
};

exports.deleteDocument = async (req, res, next) => {
  try {
    const { fileKey } = req.query;
    const result = await caProfileService.deleteDocument(
      req.user,
      fileKey
    );

    return sendResponse(res, 200, {
      data: result
    });

  } catch (err) {
    next(err);
  }
};

exports.submitPendingProfile = async (req, res, next) => {
  try {
    const result = await caProfileService.submitPendingProfile(req.user);

    return sendResponse(res, 200, {
      message: "Profile submitted for review",
      data: result
    });

  } catch (error) {
    next(error);
  }
};

