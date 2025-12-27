import { Request, Response } from 'express';
import { query, validationResult } from 'express-validator';
import analyticsService from '../services/AnalyticsService';
import { AppError } from '../middleware/errorHandler';

/**
 * Owner Analytics Controller
 * 
 * Endpoints for Owner Dashboard analytics
 * All read-only, derived from events
 * Multi-owner safe with access verification
 * 
 * SECURITY: All endpoints verify owner access to warehouse
 */

/**
 * GET /api/owner/analytics/snapshot
 * Executive dashboard snapshot
 */
export const getSnapshot = async (req: Request, res: Response): Promise<void> => {
  try {
    const warehouseId = req.user?.warehouse_id;
    const userId = req.user?.user_id;

    if (!warehouseId || !userId) {
      throw new AppError('Warehouse or user not found', 400);
    }

    // Verify access (multi-owner safe)
    const hasAccess = await analyticsService.verifyOwnerAccess(userId, warehouseId);
    if (!hasAccess) {
      throw new AppError('Access denied to this warehouse', 403);
    }

    const snapshot = await analyticsService.getExecutiveSnapshot(warehouseId);

    res.json({
      success: true,
      data: snapshot,
    });
  } catch (error) {
    throw error instanceof AppError ? error : new AppError('Failed to get dashboard snapshot', 500);
  }
};

/**
 * GET /api/owner/analytics/transactions
 * Transaction history with pagination and filters
 */
export const getTransactionValidation = [
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt(),
  query('crop').optional().isString(),
  query('buyerType').optional().isString(),
  query('paymentStatus').optional().isString(),
  query('status').optional().isString(),
];

export const getTransactions = async (req: Request, res: Response): Promise<void> => {
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
    const warehouseId = req.user?.warehouse_id;
    const userId = req.user?.user_id;

    if (!warehouseId || !userId) {
      throw new AppError('Warehouse or user not found', 400);
    }

    // Verify access
    const hasAccess = await analyticsService.verifyOwnerAccess(userId, warehouseId);
    if (!hasAccess) {
      throw new AppError('Access denied to this warehouse', 403);
    }

    const { limit, offset, crop, buyerType, paymentStatus, status } = req.query;

    const result = await analyticsService.getTransactionHistory(warehouseId, {
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      crop: crop as any,
      buyerType: buyerType as any,
      paymentStatus: paymentStatus as any,
      status: status as string,
    });

    res.json({
      success: true,
      data: result.transactions,
      pagination: {
        total: result.total,
        limit: limit ? Number(limit) : 50,
        offset: offset ? Number(offset) : 0,
      },
    });
  } catch (error) {
    throw error instanceof AppError ? error : new AppError('Failed to get transactions', 500);
  }
};

/**
 * GET /api/owner/analytics/transactions/:requestId
 * Transaction details with batch breakdown
 */
export const getTransactionDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { requestId } = req.params;
    const warehouseId = req.user?.warehouse_id;
    const userId = req.user?.user_id;

    if (!warehouseId || !userId) {
      throw new AppError('Warehouse or user not found', 400);
    }

    // Verify access
    const hasAccess = await analyticsService.verifyOwnerAccess(userId, warehouseId);
    if (!hasAccess) {
      throw new AppError('Access denied to this warehouse', 403);
    }

    const details = await analyticsService.getTransactionDetails(requestId, warehouseId);

    res.json({
      success: true,
      data: details,
    });
  } catch (error) {
    throw error instanceof AppError ? error : new AppError('Failed to get transaction details', 500);
  }
};

/**
 * GET /api/owner/analytics/batches
 * Batch analytics with aging indicators
 */
export const getBatches = async (req: Request, res: Response): Promise<void> => {
  try {
    const warehouseId = req.user?.warehouse_id;
    const userId = req.user?.user_id;

    if (!warehouseId || !userId) {
      throw new AppError('Warehouse or user not found', 400);
    }

    // Verify access
    const hasAccess = await analyticsService.verifyOwnerAccess(userId, warehouseId);
    if (!hasAccess) {
      throw new AppError('Access denied to this warehouse', 403);
    }

    const batches = await analyticsService.getBatchAnalytics(warehouseId);

    res.json({
      success: true,
      data: batches,
    });
  } catch (error) {
    throw error instanceof AppError ? error : new AppError('Failed to get batch analytics', 500);
  }
};

/**
 * GET /api/owner/analytics/credit
 * Outstanding credit monitoring
 */
export const getOutstandingCredit = async (req: Request, res: Response): Promise<void> => {
  try {
    const warehouseId = req.user?.warehouse_id;
    const userId = req.user?.user_id;

    if (!warehouseId || !userId) {
      throw new AppError('Warehouse or user not found', 400);
    }

    // Verify access
    const hasAccess = await analyticsService.verifyOwnerAccess(userId, warehouseId);
    if (!hasAccess) {
      throw new AppError('Access denied to this warehouse', 403);
    }

    const credit = await analyticsService.getOutstandingCredit(warehouseId);

    res.json({
      success: true,
      data: credit,
    });
  } catch (error) {
    throw error instanceof AppError ? error : new AppError('Failed to get outstanding credit', 500);
  }
};

/**
 * GET /api/owner/analytics/buyers
 * Buyer and market breakdown
 */
export const getBuyerBreakdown = async (req: Request, res: Response): Promise<void> => {
  try {
    const warehouseId = req.user?.warehouse_id;
    const userId = req.user?.user_id;

    if (!warehouseId || !userId) {
      throw new AppError('Warehouse or user not found', 400);
    }

    // Verify access
    const hasAccess = await analyticsService.verifyOwnerAccess(userId, warehouseId);
    if (!hasAccess) {
      throw new AppError('Access denied to this warehouse', 403);
    }

    const breakdown = await analyticsService.getBuyerBreakdown(warehouseId);

    res.json({
      success: true,
      data: breakdown,
    });
  } catch (error) {
    throw error instanceof AppError ? error : new AppError('Failed to get buyer breakdown', 500);
  }
};

/**
 * GET /api/owner/analytics/tools-dashboard
 * Tool accountability dashboard
 */
export const getToolsDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const warehouseId = req.user?.warehouse_id;
    const userId = req.user?.user_id;

    if (!warehouseId || !userId) {
      throw new AppError('Warehouse or user not found', 400);
    }

    // Verify access
    const hasAccess = await analyticsService.verifyOwnerAccess(userId, warehouseId);
    if (!hasAccess) {
      throw new AppError('Access denied to this warehouse', 403);
    }

    const tools = await analyticsService.getToolDashboard(warehouseId);

    res.json({
      success: true,
      data: tools,
    });
  } catch (error) {
    throw error instanceof AppError ? error : new AppError('Failed to get tools dashboard', 500);
  }
};

/**
 * GET /api/owner/analytics/tools/:toolId/history
 * Tool assignment history
 */
export const getToolHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { toolId } = req.params;
    const warehouseId = req.user?.warehouse_id;
    const userId = req.user?.user_id;

    if (!warehouseId || !userId) {
      throw new AppError('Warehouse or user not found', 400);
    }

    // Verify access
    const hasAccess = await analyticsService.verifyOwnerAccess(userId, warehouseId);
    if (!hasAccess) {
      throw new AppError('Access denied to this warehouse', 403);
    }

    const history = await analyticsService.getToolHistory(toolId, warehouseId);

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    throw error instanceof AppError ? error : new AppError('Failed to get tool history', 500);
  }
};

/**
 * GET /api/owner/analytics/attendants
 * Attendant activity summary
 */
export const getAttendantActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const warehouseId = req.user?.warehouse_id;
    const userId = req.user?.user_id;

    if (!warehouseId || !userId) {
      throw new AppError('Warehouse or user not found', 400);
    }

    // Verify access
    const hasAccess = await analyticsService.verifyOwnerAccess(userId, warehouseId);
    if (!hasAccess) {
      throw new AppError('Access denied to this warehouse', 403);
    }

    const activity = await analyticsService.getAttendantActivity(warehouseId);

    res.json({
      success: true,
      data: activity,
    });
  } catch (error) {
    throw error instanceof AppError ? error : new AppError('Failed to get attendant activity', 500);
  }
};

/**
 * GET /api/owner/warehouses
 * Get all warehouses for the logged-in owner (multi-owner support)
 */
export const getOwnerWarehouses = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;

    if (!userId) {
      throw new AppError('User not found', 400);
    }

    const warehouses = await analyticsService.getOwnerWarehouses(userId);

    res.json({
      success: true,
      data: warehouses,
    });
  } catch (error) {
    throw error instanceof AppError ? error : new AppError('Failed to get warehouses', 500);
  }
};
