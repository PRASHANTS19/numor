const router = require('express').Router();
const auth = require('../../middlewares/auth.middleware');
const { requirePermission } = require('../../middlewares/permission.middleware');
const controller = require('./dashboard.controller');

router.get(
  '/userRevenue',
  auth,
  requirePermission('dashboard', 'read'),
  controller.userRevenue
)
router.get(
  '/userExpense',
  auth,
  requirePermission('dashboard', 'read'),
  controller.userExpense
)

router.get(
  '/dashboardSummary',
  auth,
  requirePermission('dashboard', 'read'),
  controller.dashboardSummary
)

router.get(
  '/dashboardSummary',
  auth,
  requirePermission('dashboard', 'read'),
  controller.dashboardSummary
)

router.get(
  '/revenueExpenseTrend',
  auth,
  requirePermission('dashboard', 'read'),
  controller.revenueExpenseTrend
)

module.exports = router;
