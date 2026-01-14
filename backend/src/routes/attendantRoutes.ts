import { Router } from 'express';
import * as attendantController from '../controllers/attendantController';
import * as batchController from '../controllers/batchController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types/enums';

const router = Router();

// All attendant routes require ATTENDANT role
router.use(authenticate, authorize(UserRole.ATTENDANT));

/**
 * GET /attendant/home
 * Get attendant home dashboard (stock + my recent requests)
 */
router.get('/home', attendantController.getHome);

/**
 * GET /attendant/stock
 * Get current stock levels
 */
router.get('/stock', attendantController.getStock);

/**
 * POST /attendant/inbound
 * Log inbound stock with photo
 */
router.post(
  '/inbound',
  attendantController.logInboundValidation,
  attendantController.logInbound
);

/**
 * POST /attendant/requests
 * Request dispatch
 */
router.post(
  '/requests',
  attendantController.requestDispatchValidation,
  attendantController.requestDispatch
);

/**
 * GET /attendant/requests
 * Get attendant's requests
 */
router.get('/requests', attendantController.getMyRequests);

/**
 * POST /attendant/requests/:requestId/execute
 * Execute approved dispatch with photo
 */
router.post(
  '/requests/:requestId/execute',
  attendantController.executeDispatchValidation,
  attendantController.executeDispatch
);

/**
 * GET /attendant/tools
 * Get attendant's assigned tools
 */
router.get('/tools', attendantController.getMyTools);

/**
 * POST /attendant/tools/:toolId/return
 * Return a tool
 */
router.post(
  '/tools/:toolId/return',
  attendantController.returnToolValidation,
  attendantController.returnTool
);

/**
 * POST /attendant/requests/:requestId/confirm-payment
 * Confirm payment received (for credit payments)
 */
router.post(
  '/requests/:requestId/confirm-payment',
  attendantController.confirmPaymentValidation,
  attendantController.confirmPayment
);

/**
 * GET /attendant/farmers-with-recovery
 * Get list of farmers with outstanding recovery
 */
router.get('/farmers-with-recovery', attendantController.getFarmersWithRecovery);

/**
 * POST /attendant/batch/scan
 * Scan batch QR code during dispatch execution
 */
router.post(
  '/batch/scan',
  batchController.scanBatchValidation,
  batchController.scanBatch
);

/**
 * GET /attendant/batch/verify/:batchCode
 * Verify batch QR code
 */
router.get('/batch/verify/:batchCode', batchController.verifyBatch);

/**
 * POST /attendant/recovery-inbound
 * Record recovery inbound (linked to service record)
 */
router.post(
  '/recovery-inbound',
  attendantController.recordRecoveryValidation,
  attendantController.recordRecoveryInbound
);

/**
 * POST /attendant/aggregated-inbound
 * Record aggregated inbound (independent)
 */
router.post(
  '/aggregated-inbound',
  attendantController.recordAggregatedValidation,
  attendantController.recordAggregatedInbound
);

export default router;
