const router = require('express').Router();
const auth = require('../../middlewares/auth.middleware');
const { upload } = require('../../config/upload');
const { requirePermission } = require('../../middlewares/permission.middleware');
const controller = require('./invoice.controller');

router.post(
  '/parseInvoice',
  auth,
  requirePermission('income', 'write'),
  upload.single('file'),
  controller.parseInvoice
);

router.post(
  '/confirmAndSaveInvoice',
  auth,
  requirePermission('income', 'write'),
  controller.confirmAndSaveInvoice
)

router.get(
  "/export",
  auth,
  requirePermission('income', 'read'),
  controller.exportInvoices
);

// router.post(
//   '/saveInvoice',
//   auth,
//   controller.confirmAndSaveInvoice
// )

router.get(
  '/',
  auth,
  requirePermission('income', 'read'),
  controller.listInvoices
)

router.get(
  '/:id/products',
  auth,
  requirePermission('income', 'read'),
  controller.listInvoiceProduct
)

router.post(
  '/createInvoice',
  auth,
  requirePermission('income', 'write'),
  controller.confirmAndCreateInvoice
)

router.post(
  '/:id/updateInvoice',
  auth,
  requirePermission('income', 'write'),
  controller.confirmAndUpdateInvoice
)

router.get(
  '/:id',
  auth,
  requirePermission('income', 'read'),
  controller.getInvoice
);

router.get(
  '/:id/pdf',
  auth,
  requirePermission('income', 'read'),
  controller.getInvoicePdf
);

router.get(
  '/:id/pdf/stream',
  auth,
  requirePermission('income', 'read'),
  controller.streamInvoicePdfStatus
)

router.delete(
  '/:id',
  auth,
  requirePermission('income', 'write'),
  controller.deleteInvoice
)

module.exports = router;
