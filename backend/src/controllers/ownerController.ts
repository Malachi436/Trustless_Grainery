import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import stockProjectionService from '../services/StockProjectionService';
import outboundService from '../services/OutboundService';
import genesisService from '../services/GenesisService';
import eventService from '../services/EventService';
import { RequestStatus } from '../types/enums';
import { AppError } from '../middleware/errorHandler';

/**
 * Owner Controller
 * OWNER role endpoints:
 * - View warehouse dashboard (stock, pending approvals)
 * - Approve/reject dispatch requests
 * - View audit timeline
 * - Confirm genesis inventory (one-time)
 */

/**
 * Get owner dashboard data
 * GET /api/owner/dashboard
 */
export const getDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.warehouse_id) {
      throw new AppError('Warehouse not assigned', 400);
    }

    const warehouseId = req.user.warehouse_id;

    // Get current stock
    const stock = await stockProjectionService.getCurrentStock(warehouseId);

    // Get pending approvals
    const pendingRequests = await outboundService.getWarehouseRequests(
      warehouseId,
      RequestStatus.PENDING
    );

    // Get recent requests
    const recentRequests = await outboundService.getWarehouseRequests(warehouseId);

    res.json({
      success: true,
      data: {
        stock,
        pendingApprovals: pendingRequests,
        recentRequests: recentRequests.slice(0, 10),
      },
    });
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to get dashboard',
      500
    );
  }
};

/**
 * Get current stock
 * GET /api/owner/stock
 */
export const getStock = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.warehouse_id) {
      throw new AppError('Warehouse not assigned', 400);
    }

    const stock = await stockProjectionService.getCurrentStock(req.user.warehouse_id);

    res.json({
      success: true,
      data: stock,
    });
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to get stock',
      500
    );
  }
};

/**
 * Get pending approvals
 * GET /api/owner/approvals
 */
export const getPendingApprovals = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.warehouse_id) {
      throw new AppError('Warehouse not assigned', 400);
    }

    const requests = await outboundService.getWarehouseRequests(
      req.user.warehouse_id,
      RequestStatus.PENDING
    );

    res.json({
      success: true,
      data: requests,
    });
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to get approvals',
      500
    );
  }
};

export const approveRequestValidation = [
  body('notes').optional().isString(),
];

/**
 * Approve dispatch request
 * POST /api/owner/approvals/:requestId/approve
 */
export const approveRequest = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array(),
    });
    return;
  }

  try {
    const { requestId } = req.params;
    const { notes } = req.body;

    if (!req.user?.user_id) {
      throw new AppError('Not authenticated', 401);
    }

    const result = await outboundService.approveRequest(
      requestId,
      req.user.user_id,
      notes
    );

    res.json({
      success: true,
      data: {
        eventId: result.eventId,
        message: 'Request approved successfully',
      },
    });
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to approve request',
      500
    );
  }
};

export const rejectRequestValidation = [
  body('reason').trim().notEmpty().withMessage('Rejection reason is required'),
];

/**
 * Reject dispatch request
 * POST /api/owner/approvals/:requestId/reject
 */
export const rejectRequest = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array(),
    });
    return;
  }

  try {
    const { requestId } = req.params;
    const { reason } = req.body;

    if (!req.user?.user_id) {
      throw new AppError('Not authenticated', 401);
    }

    const result = await outboundService.rejectRequest(
      requestId,
      req.user.user_id,
      reason
    );

    res.json({
      success: true,
      data: {
        eventId: result.eventId,
        message: 'Request rejected successfully',
      },
    });
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to reject request',
      500
    );
  }
};

/**
 * Get audit timeline (all events)
 * GET /api/owner/audit
 */
export const getAuditTimeline = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.warehouse_id) {
      throw new AppError('Warehouse not assigned', 400);
    }

    const { limit = 100, offset = 0 } = req.query;

    const events = await eventService.getEventsByWarehouse(req.user.warehouse_id, {
      limit: Number(limit),
      offset: Number(offset),
    });

    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to get audit timeline',
      500
    );
  }
};

export const confirmGenesisValidation = [
  // No body validation needed - just confirming what admin already recorded
];

/**
 * Confirm genesis inventory (one-time warehouse activation)
 * POST /api/owner/genesis
 */
export const confirmGenesis = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array(),
    });
    return;
  }

  try {
    if (!req.user?.warehouse_id || !req.user?.user_id) {
      throw new AppError('Not authenticated properly', 401);
    }

    // Just confirm the genesis that was already recorded by admin
    await genesisService.confirmGenesis(
      req.user.warehouse_id,
      req.user.user_id
    );

    // Get updated stock after confirmation
    const stock = await stockProjectionService.getCurrentStock(req.user.warehouse_id);

    res.json({
      success: true,
      data: {
        stock,
        message: 'Genesis inventory confirmed successfully. Warehouse is now ACTIVE.',
      },
    });
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to confirm genesis',
      500
    );
  }
};
