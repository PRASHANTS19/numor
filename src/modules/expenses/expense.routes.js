const router = require('express').Router();
const auth = require('../../middlewares/auth.middleware');
const {upload} = require('../../config/upload');
const { requirePermission } = require('../../middlewares/permission.middleware');
const controller = require('./expense.controller');

// router.post(
//   '/ocr/uploadExpense',
//   auth,
//   upload.single('file'),
//   controller.previewOCR
// );

router.get(
  "/export",
  auth,
  requirePermission('expense', 'read'),
  controller.exportExpenses
);

router.post(
  '/parseExpense',
  auth,
  requirePermission('expense', 'write'),
  upload.single('file'),
  controller.parseExpense
);

router.post(
  '/confirmAndSaveExpense',
  auth,
  requirePermission('expense', 'write'),
  controller.confirmExpense
)

router.get(
  '/',
  auth,
  requirePermission('expense', 'read'),
  controller.listExpenses
)

router.get(
  '/:id', 
  auth, 
  requirePermission('expense', 'read'),
  controller.getExpense
);

router.get(
  '/:id/items',
  auth,
  requirePermission('expense', 'read'),
  controller.listExpenseItems
)

router.post(
  '/:id/updateExpense',
  auth,
  requirePermission('expense', 'write'),
  controller.updateExpense
)

router.delete(
  '/:id',
  auth,
  requirePermission('expense', 'write'),
  controller.deleteExpense
)

router.get(
  '/:id/receipt',
  auth, 
  requirePermission('expense', 'read'),
  controller.getExpenseReceipt
);

module.exports = router;
