import { Router } from 'express';
import * as ownerController from '../controllers/ownerController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types/enums';

const router = Router();

// All owner routes require OWNER role
router.use(authenticate, authorize(UserRole.OWNER));

/**
 * GET /owner/dashboard
 * Get warehouse dashboard (stock + pending approvals)
 */
router.get('/dashboard', ownerController.getDashboard);

/**
 * GET /owner/stock
 * Get current stock levels
 */
router.get('/stock', ownerController.getStock);

/**
 * GET /owner/approvals
 * Get pending dispatch requests
 */
router.get('/approvals', ownerController.getPendingApprovals);

/**
 * POST /owner/approvals/:requestId/approve
 * Approve dispatch request
 */
router.post(
  '/approvals/:requestId/approve',
  ownerController.approveRequestValidation,
  ownerController.approveRequest
);

/**
 * POST /owner/approvals/:requestId/reject
 * Reject dispatch request
 */
router.post(
  '/approvals/:requestId/reject',
  ownerController.rejectRequestValidation,
  ownerController.rejectRequest
);

/**
 * GET /owner/audit
 * Get audit timeline (all events)
 */
router.get('/audit', ownerController.getAuditTimeline);

/**
 * POST /owner/genesis
 * Confirm genesis inventory (one-time activation)
 */
router.post(
  '/genesis',
  ownerController.confirmGenesisValidation,
  ownerController.confirmGenesis
);

/**
 * GET /owner/batches
 * Get all batches for warehouse
 * Query params: ?crop=MAIZE&available=true
 */
router.get('/batches', ownerController.getBatches);

/**
 * GET /owner/tools
 * Get all tools for warehouse
 * Query params: ?status=AVAILABLE
 */
router.get('/tools', ownerController.getTools);

/**
 * POST /owner/tools/:toolId/assign
 * Assign tool to attendant
 */
router.post(
  '/tools/:toolId/assign',
  ownerController.assignToolValidation,
  ownerController.assignTool
);

export default router;
