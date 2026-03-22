const router = require('express').Router();
const authenticate = require('../../../middlewares/auth.middleware');
const controller = require('./caProfile.controller');
const role = require('../../../middlewares/role.middleware');
const { caUpload } = require('../../../config/upload');

router.get(
    '/me',
    authenticate,
    role('CA_USER'),
    controller.getCAProfile);

router.post(
    '/',
    authenticate,
    role('CA_USER'),
    controller.createCAProfile);

router.put(
    '/',
    authenticate,
    role('CA_USER'),
    controller.updateCAProfile);

router.delete(
    '/',
    authenticate,
    role('CA_USER'),
    controller.deleteCAProfile);

router.post(
    '/documents',
    authenticate,
    caUpload.single("file"),
    role('CA_USER'),
    controller.uploadDocument);

router.get(
    "/documents",
    authenticate,
    role("CA_USER"),
    controller.getDocuments
);


router.delete(
    '/documents/:documentId',
    authenticate,
    role('CA_USER'),
    controller.deleteDocument);

router.post(
  "/submit",
  authenticate,
  role('CA_USER'),
  controller.submitPendingProfile
);

module.exports = router;