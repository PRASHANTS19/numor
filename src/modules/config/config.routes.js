const router = require('express').Router();
const controller = require('./config.controller');

router.get('/feature-flags', controller.getFeatureFlags);

module.exports = router;
