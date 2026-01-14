import { Router } from 'express';
import * as batchController from '../controllers/batchController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types/enums';

const router = Router();

/**
 * Owner Batch Management Routes
 */
router.get(
  '/owner/batches',
  authenticate,
  authorize(UserRole.OWNER),
  batchController.getBatchesValidation,
  batchController.getBatches
);

router.get(
  '/owner/batches/:batchId',
  authenticate,
  authorize(UserRole.OWNER),
  batchController.getBatchById
);

router.get(
  '/owner/batches/:batchId/qr',
  authenticate,
  authorize(UserRole.OWNER),
  batchController.getBatchQRCode
);

router.get(
  '/owner/batches/:batchId/allocations',
  authenticate,
  authorize(UserRole.OWNER),
  batchController.getBatchAllocations
);

/**
 * Attendant Batch Scanning Route
 */
router.post(
  '/attendant/batch/scan',
  authenticate,
  authorize(UserRole.ATTENDANT),
  batchController.scanBatchValidation,
  batchController.scanBatch
);

export default router;
