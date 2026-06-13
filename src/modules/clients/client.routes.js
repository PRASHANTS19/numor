const router = require('express').Router();
const auth = require('../../middlewares/auth.middleware');
const { requirePermission } = require('../../middlewares/permission.middleware');
const controller = require('./client.controller');

router.post(
  '/createClient',
  auth,
  requirePermission('income', 'write'),
  controller.createClient
);

router.get(
  '/',
  auth,
  requirePermission('income', 'read'),
  controller.listClients
)

router.get(
  '/:id/getClient',
  auth,
  requirePermission('income', 'read'),
  controller.getClient
)

router.put(
  '/:clientId/updateClient',
  auth,
  requirePermission('income', 'write'),
  controller.updateClient
);

router.delete(
  '/:clientId/deleteClient',
  auth,
  requirePermission('income', 'write'),
  controller.deleteClient
);


module.exports = router;
