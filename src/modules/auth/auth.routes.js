const router = require('express').Router();
const controller = require('./auth.controller');
const validate = require('../../middlewares/validate.middleware');
const { registerSchema } = require('./auth.validator');
const auth = require('../../middlewares/auth.middleware');

router.post(
    '/register',
    validate(registerSchema),
    controller.register);

router.post(
    '/login',
    controller.login);

router.post(
    '/logout',
    auth,
    controller.logout);

router.post(
    '/google',
    controller.googleLogin);

router.get(
    '/google-local-storage-based-login',
    controller.googleLocalStorageBasedLogin
)

router.post(
    '/forgetPassword',
    controller.forgetPassword
)

router.post(
    '/resetPassword',
    controller.resetUserPassword
)

module.exports = router;
