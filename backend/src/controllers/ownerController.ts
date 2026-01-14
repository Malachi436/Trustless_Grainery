import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import stockProjectionService from '../services/StockProjectionService';
import outboundService from '../services/OutboundService';
import genesisService from '../services/GenesisService';
import eventService from '../services/EventService';
import batchService from '../services/BatchService';
import toolService from '../services/ToolService';
import authService from '../services/AuthService';
import db from '../config/database';
import logger from '../config/logger';
import { RequestStatus, CropType, ToolStatus, UserRole, PaymentStatus } from '../types/enums';
import { AppError } from '../middleware/errorHandler';

/**
 * Owner Controller
 * OWNER role endpoints:
 * - View warehouse dashboard (stock, pending approvals)
 * - Approve/reject dispatch requests (with batch/payment details - v2)
 * - View audit timeline
 * - Confirm genesis inventory (one-time)
 * - Manage batches (v2)
 * - Manage tool assignments (v2)
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
    const { 
      notes, 
      batchBreakdown, 
      buyerType, 
      buyerNameFinal, 
      buyerPhoneFinal, 
      paymentMethod, 
      pricePerBag 
    } = req.body;

    if (!req.user?.user_id) {
      throw new AppError('Not authenticated', 401);
    }

    const result = await outboundService.approveRequest(
      requestId,
      req.user.user_id,
      notes,
      batchBreakdown,
      buyerType,
      buyerNameFinal,
      buyerPhoneFinal,
      paymentMethod,
      pricePerBag
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

/**
 * Get batch allocations for a request
 * GET /api/owner/requests/:requestId/allocations
 */
export const getRequestBatchAllocations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { requestId } = req.params;

    if (!req.user?.warehouse_id) {
      throw new AppError('Warehouse not assigned', 400);
    }

    const allocations = await batchService.getRequestBatchAllocations(requestId);

    res.json({
      success: true,
      data: allocations,
    });
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to get batch allocations',
      500
    );
  }
};

/**
 * Verify QR code / Get batch by code
 * GET /api/owner/batches/verify/:batchCode
 */
export const verifyBatchQR = async (req: Request, res: Response): Promise<void> => {
  try {
    const { batchCode } = req.params;

    logger.info('🔍 QR Verification Request', { batchCode, warehouseId: req.user?.warehouse_id });

    if (!req.user?.warehouse_id) {
      throw new AppError('Warehouse not assigned', 400);
    }

    const batch = await batchService.getBatchByCode(batchCode);

    logger.info('📦 Batch Query Result', { found: !!batch, batchCode });

    if (!batch) {
      logger.warn('❌ Batch not found', { batchCode });
      res.status(404).json({
        success: false,
        error: 'Batch not found',
      });
      return;
    }

    logger.info('🏢 Warehouse Check', { 
      batchWarehouse: batch.warehouse_id, 
      userWarehouse: req.user.warehouse_id,
      match: batch.warehouse_id === req.user.warehouse_id
    });

    // Verify batch belongs to this warehouse
    if (batch.warehouse_id !== req.user.warehouse_id) {
      logger.warn('❌ Warehouse mismatch', { batchWarehouse: batch.warehouse_id, userWarehouse: req.user.warehouse_id });
      res.status(403).json({
        success: false,
        error: 'Batch does not belong to your warehouse',
      });
      return;
    }

    logger.info('✅ QR Verified Successfully', { batchCode, batchId: batch.id });
    res.json({
      success: true,
      data: batch,
    });
  } catch (error) {
    logger.error('❌ QR Verification Error', error);
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to verify QR code',
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

    const { limit = 100 } = req.query;

    const events = await eventService.getEventsByWarehouse(req.user.warehouse_id, {
      limit: Number(limit),
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
 * Get genesis status for warehouse
 * GET /api/owner/genesis-status
 */
export const getGenesisStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.warehouse_id) {
      throw new AppError('Warehouse not assigned', 400);
    }

    const genesisStatus = await genesisService.getGenesisStatus(req.user.warehouse_id);

    res.json({
      success: true,
      data: genesisStatus,
    });
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to get genesis status',
      500
    );
  }
};

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

/**
 * Get all batches for warehouse
 * GET /api/owner/batches
 */
export const getBatches = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.warehouse_id) {
      throw new AppError('Warehouse not assigned', 400);
    }

    const { crop, available } = req.query;
    const cropType = crop ? (crop as CropType) : undefined;
    const onlyAvailable = available === 'true';

    const batches = await batchService.getWarehouseBatches(
      req.user.warehouse_id,
      cropType,
      onlyAvailable
    );

    // Transform snake_case to camelCase for frontend compatibility
    const transformedBatches = batches.map(batch => ({
      id: batch.id,
      batchCode: batch.batch_code,
      warehouseId: batch.warehouse_id,
      cropType: batch.crop_type,
      sourceType: batch.source_type,
      sourceName: batch.source_name,
      sourceLocation: batch.source_location,
      purchasePricePerBag: batch.purchase_price_per_bag,
      initialBags: batch.initial_bags,
      remainingBags: batch.remaining_bags,
      createdAt: batch.created_at,
      createdBy: batch.created_by,
      qrCodeData: batch.qr_code_data,
      warehouseCode: batch.warehouse_code,
    }));

    res.json({
      success: true,
      data: transformedBatches,
    });
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to get batches',
      500
    );
  }
};

/**
 * Get all tools for warehouse
 * GET /api/owner/tools
 */
export const getTools = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.warehouse_id) {
      throw new AppError('Warehouse not assigned', 400);
    }

    const { status } = req.query;
    const toolStatus = status ? (status as ToolStatus) : undefined;

    const tools = await toolService.getWarehouseTools(
      req.user.warehouse_id,
      toolStatus
    );

    res.json({
      success: true,
      data: tools,
    });
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to get tools',
      500
    );
  }
};

/**
 * Assign tool to attendant
 * POST /api/owner/tools/:toolId/assign
 */
export const assignToolValidation = [
  body('attendantId').isUUID().withMessage('Valid attendant ID required'),
  body('notes').optional().isString(),
];

export const assignTool = async (req: Request, res: Response): Promise<void> => {
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
    if (!req.user?.user_id) {
      throw new AppError('User not authenticated', 401);
    }

    const { toolId } = req.params;
    const { attendantId, notes } = req.body;

    const result = await toolService.assignTool(
      toolId,
      attendantId,
      req.user.user_id,
      notes
    );

    res.json({
      success: true,
      data: {
        eventId: result.eventId,
        message: 'Tool assigned successfully',
      },
    });
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to assign tool',
      500
    );
  }
};

/**
 * Create warehouse staff (Attendants/Field Agents)
 * POST /api/owner/staff
 * Only owners can create staff for their warehouse
 */
export const createStaffValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('pin').trim().notEmpty().withMessage('PIN is required').isLength({ min: 4, max: 4 }).withMessage('PIN must be 4 digits'),
  body('role').isIn(['ATTENDANT', 'FIELD_AGENT']).withMessage('Role must be ATTENDANT or FIELD_AGENT'),
];

export const createStaff = async (req: Request, res: Response): Promise<void> => {
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
    const { name, phone, pin, role } = req.body;
    const warehouseId = req.user?.warehouse_id;

    if (!warehouseId) {
      throw new AppError('Warehouse not assigned', 400);
    }

    // Verify user is owner of this warehouse
    if (req.user?.role !== UserRole.OWNER) {
      throw new AppError('Only warehouse owners can create staff', 403);
    }

    const user = await authService.createUser(
      name,
      phone,
      pin,
      role as UserRole,
      warehouseId
    );

    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
      message: `${role === 'ATTENDANT' ? 'Attendant' : 'Field Agent'} created successfully`,
    });
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to create staff',
      500
    );
  }
};

/**
 * Get warehouse staff
 * GET /api/owner/staff
 */
export const getStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const warehouseId = req.user?.warehouse_id;

    if (!warehouseId) {
      throw new AppError('Warehouse not assigned', 400);
    }

    const staff = await authService.getUsersByWarehouse(warehouseId);
    
    // Filter out owners, only return attendants and field agents
    const filteredStaff = staff.filter(u => 
      u.role === UserRole.ATTENDANT || u.role === UserRole.FIELD_AGENT
    );

    res.json({
      success: true,
      data: filteredStaff.map(s => ({
        id: s.id,
        name: s.name,
        phone: s.phone,
        role: s.role,
        created_at: s.created_at,
      })),
    });
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to get staff',
      500
    );
  }
};

/**
 * Get upcoming recoveries (next 4 weeks)
 * GET /api/owner/upcoming-recoveries
 */
export const getUpcomingRecoveries = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.warehouse_id) {
      throw new AppError('Warehouse not assigned', 400);
    }

    const result = await db.query(
      `SELECT * FROM upcoming_recoveries WHERE warehouse_id = $1`,
      [req.user.warehouse_id]
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to get upcoming recoveries',
      500
    );
  }
};

/**
 * Get recovery date change notifications
 * GET /api/owner/date-change-notifications
 */
export const getDateChangeNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.warehouse_id) {
      throw new AppError('Warehouse not assigned', 400);
    }

    // Get all date updates from the last 30 days
    const result = await db.query(
      `SELECT 
        rdu.id,
        rdu.service_record_id,
        rdu.old_date,
        rdu.new_date,
        rdu.reason,
        rdu.created_at,
        f.name AS farmer_name,
        fa.name AS field_agent_name,
        sr.expected_bags
       FROM recovery_date_updates rdu
       INNER JOIN service_records sr ON rdu.service_record_id = sr.id
       INNER JOIN farmers f ON rdu.farmer_id = f.id
       INNER JOIN field_agents fa ON rdu.field_agent_id = fa.id
       WHERE rdu.warehouse_id = $1
         AND rdu.created_at >= CURRENT_DATE - INTERVAL '30 days'
       ORDER BY rdu.created_at DESC`,
      [req.user.warehouse_id]
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to get date change notifications',
      500
    );
  }
};

/**
 * Record credit payment (Owner)
 * POST /api/owner/credit/:transactionId/record-payment
 * Allows owner to record partial or full payments for outstanding credit
 */
export const recordCreditPaymentValidation = [
  body('amountPaid').isFloat({ min: 0.01 }).withMessage('Amount paid must be greater than 0'),
  body('notes').optional().isString(),
];

export const recordCreditPayment = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array(),
    });
    return;
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const { transactionId } = req.params;
    const { amountPaid, notes } = req.body;

    if (!req.user?.user_id || !req.user?.warehouse_id) {
      throw new AppError('Not authenticated', 401);
    }

    // Get transaction details
    const txResult = await client.query(
      'SELECT * FROM transaction_projections WHERE transaction_id = $1',
      [transactionId]
    );

    if (txResult.rows.length === 0) {
      throw new AppError('Transaction not found', 404);
    }

    const transaction = txResult.rows[0];

    // Verify ownership
    if (transaction.warehouse_id !== req.user.warehouse_id) {
      throw new AppError('Access denied to this transaction', 403);
    }

    // Verify it's a credit transaction
    if (transaction.payment_method !== 'CREDIT') {
      throw new AppError('This transaction is not a credit payment', 400);
    }

    // Get current payment tracking
    const trackingResult = await client.query(
      'SELECT * FROM credit_payment_tracking WHERE transaction_id = $1',
      [transactionId]
    );

    const totalAmount = parseFloat(transaction.total_amount || '0');
    const currentPaid = trackingResult.rows[0]?.total_paid || 0;
    const newTotalPaid = parseFloat(currentPaid) + parseFloat(amountPaid);

    if (newTotalPaid > totalAmount) {
      throw new AppError(
        `Payment exceeds total amount. Total: ${totalAmount}, Already paid: ${currentPaid}, Attempting: ${amountPaid}`,
        400
      );
    }

    const remainingAmount = totalAmount - newTotalPaid;
    const newStatus = remainingAmount <= 0.01 ? PaymentStatus.PAID : PaymentStatus.PENDING;

    // Insert/update payment tracking
    if (trackingResult.rows.length === 0) {
      await client.query(
        `INSERT INTO credit_payment_tracking 
         (transaction_id, total_amount, total_paid, remaining_amount, payment_status, last_payment_date, last_payment_by)
         VALUES ($1, $2, $3, $4, $5, NOW(), $6)`,
        [transactionId, totalAmount, newTotalPaid, remainingAmount, newStatus, req.user.user_id]
      );
    } else {
      await client.query(
        `UPDATE credit_payment_tracking 
         SET total_paid = $1, remaining_amount = $2, payment_status = $3, last_payment_date = NOW(), last_payment_by = $4
         WHERE transaction_id = $5`,
        [newTotalPaid, remainingAmount, newStatus, req.user.user_id, transactionId]
      );
    }

    // Record payment event in history
    await client.query(
      `INSERT INTO credit_payment_history 
       (transaction_id, amount_paid, payment_date, recorded_by, notes)
       VALUES ($1, $2, NOW(), $3, $4)`,
      [transactionId, amountPaid, req.user.user_id, notes || null]
    );

    // Update transaction projection payment status
    await client.query(
      'UPDATE transaction_projections SET payment_status = $1 WHERE transaction_id = $2',
      [newStatus, transactionId]
    );

    await client.query('COMMIT');

    logger.info('✅ Credit payment recorded', {
      transactionId,
      amountPaid,
      newTotalPaid,
      remainingAmount,
      newStatus,
      recordedBy: req.user.user_id,
    });

    res.json({
      success: true,
      data: {
        transactionId,
        amountPaid: parseFloat(amountPaid),
        totalPaid: newTotalPaid,
        remainingAmount,
        paymentStatus: newStatus,
        message: remainingAmount <= 0.01 
          ? 'Payment completed - credit fully paid'
          : `Partial payment recorded - GH₵${remainingAmount.toFixed(2)} remaining`,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('❌ Record credit payment failed', error);
    throw error instanceof AppError ? error : new AppError(
      error instanceof Error ? error.message : 'Failed to record payment',
      500
    );
  } finally {
    client.release();
  }
};
