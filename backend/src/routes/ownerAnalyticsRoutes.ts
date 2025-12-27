import { Router } from 'express';
import * as analyticsController from '../controllers/ownerAnalyticsController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types/enums';

const router = Router();

// All analytics routes require OWNER role
router.use(authenticate, authorize(UserRole.OWNER));

/**
 * GET /owner/analytics/snapshot
 * Executive dashboard snapshot with key metrics
 */
router.get('/snapshot', analyticsController.getSnapshot);

/**
 * GET /owner/analytics/transactions
 * Transaction history with pagination and filters
 * Query params: limit, offset, crop, buyerType, paymentStatus, status
 */
router.get(
  '/transactions',
  analyticsController.getTransactionValidation,
  analyticsController.getTransactions
);

/**
 * GET /owner/analytics/transactions/:requestId
 * Transaction details with batch breakdown and event timeline
 */
router.get('/transactions/:requestId', analyticsController.getTransactionDetails);

/**
 * GET /owner/analytics/batches
 * Batch analytics with aging indicators
 */
router.get('/batches', analyticsController.getBatches);

/**
 * GET /owner/analytics/credit
 * Outstanding credit monitoring
 */
router.get('/credit', analyticsController.getOutstandingCredit);

/**
 * GET /owner/analytics/buyers
 * Buyer and market breakdown
 */
router.get('/buyers', analyticsController.getBuyerBreakdown);

/**
 * GET /owner/analytics/tools-dashboard
 * Tool accountability dashboard
 */
router.get('/tools-dashboard', analyticsController.getToolsDashboard);

/**
 * GET /owner/analytics/tools/:toolId/history
 * Tool assignment history for specific tool
 */
router.get('/tools/:toolId/history', analyticsController.getToolHistory);

/**
 * GET /owner/analytics/attendants
 * Attendant activity summary
 */
router.get('/attendants', analyticsController.getAttendantActivity);

/**
 * GET /owner/warehouses
 * Get all warehouses for logged-in owner (multi-owner support)
 */
router.get('/warehouses', analyticsController.getOwnerWarehouses);

export default router;
