import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import inboundService from '../services/InboundService';
import outboundService from '../services/OutboundService';
import stockProjectionService from '../services/StockProjectionService';
import toolService from '../services/ToolService';
import outgrowerService from '../services/OutgrowerService';
import db from '../config/database';
import { CropType, BatchSourceType } from '../types/enums';
import { AppError } from '../middleware/errorHandler';

/**
 * Attendant Controller
 * ATTENDANT role endpoints:
 * - View home dashboard (stock summary)
 * - Log inbound stock (with photo)
 * - Request dispatch
 * - Execute approved dispatch (with photo)
 * - View own requests
 * - Manage tools (view, return) - v2
 * - Confirm payment (for credit) - v2
 */

/**
 * Get attendant home dashboard
 * GET /api/attendant/home
 */
export const getHome = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.warehouse_id) {
      throw new AppError('Warehouse not assigned', 400);
    }

    const warehouseId = req.user.warehouse_id;
    const attendantId = req.user.user_id;

    // Get current stock
    const stock = await stockProjectionService.getCurrentStock(warehouseId);

    // Get attendant's requests
    const myRequests = await outboundService.getAttendantRequests(
      attendantId,
      warehouseId
    );

    // Get recent events (inbound/outbound) by this attendant
    const recentEventsResult = await db.query(
      `SELECT 
        e.event_id,
        e.event_type,
        e.created_at,
        e.payload
      FROM events e
      WHERE e.warehouse_id = $1
        AND e.actor_id = $2
        AND e.event_type IN ('STOCK_INBOUND_RECORDED', 'DISPATCH_EXECUTED')
      ORDER BY e.created_at DESC
      LIMIT 10`,
      [warehouseId, attendantId]
    );

    // Format recent activity
    const recentActivity = recentEventsResult.rows.map((event: any) => {
      const payload = event.payload || {};
      return {
        eventId: event.event_id,
        type: event.event_type === 'STOCK_INBOUND_RECORDED' ? 'INBOUND' : 'OUTBOUND',
        crop: payload.crop || payload.cropType || 'Unknown',
        bags: payload.bag_quantity || payload.bagQuantity || payload.bags || 0,
        timestamp: event.created_at,
      };
    });

    // Count today's activities (using PostgreSQL date comparison with timezone awareness)
    const todayStatsResult = await db.query(
      `SELECT 
        COUNT(CASE WHEN event_type = 'STOCK_INBOUND_RECORDED' THEN 1 END) as entries_logged,
        COUNT(CASE WHEN event_type = 'DISPATCH_EXECUTED' THEN 1 END) as dispatched
      FROM events
      WHERE warehouse_id = $1
        AND actor_id = $2
        AND created_at::date = CURRENT_DATE`,
      [warehouseId, attendantId]
    );

    const todayStats = todayStatsResult.rows[0] || { entries_logged: 0, dispatched: 0 };

    res.json({
      success: true,
      data: {
        stock,
        myRequests: myRequests.slice(0, 5), // Last 5 requests
        recentActivity,
        entriesLogged: Math.max(0, Number(todayStats.entries_logged) || 0),
        dispatched: Math.max(0, Number(todayStats.dispatched) || 0),
      },
    });
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to get home data',
      500
    );
  }
};

/**
 * Get current stock
 * GET /api/attendant/stock
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

export const logInboundValidation = [
  body('cropType').isIn(Object.values(CropType)).withMessage('Invalid crop type'),
  body('bags').isInt({ min: 1 }).withMessage('Bags must be positive integer'),
  body('source').trim().notEmpty().withMessage('Source location is required'),
  body('photoBase64').notEmpty().withMessage('Photo is required'),
  body('batchSourceType').isIn(Object.values(BatchSourceType)).withMessage('Batch source type is required'),
  body('sourceName').optional().isString(),
  body('purchasePricePerBag').optional().isFloat({ min: 0 }),
  body('notes').optional().isString(),
];

/**
 * Log inbound stock
 * POST /api/attendant/inbound
 */
export const logInbound = async (req: Request, res: Response): Promise<void> => {
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

    const { cropType, bags, source, photoBase64, batchSourceType, sourceName, purchasePricePerBag } = req.body;

    // Save photo (for now, using base64 - in production, upload to S3)
    const photoUrl = `data:image/jpeg;base64,${photoBase64}`;

    const result = await inboundService.logInbound(
      req.user.warehouse_id,
      req.user.user_id,
      cropType,
      bags,
      photoUrl,
      [photoUrl],
      batchSourceType,
      sourceName,
      source, // sourceLocation
      purchasePricePerBag
    );

    res.json({
      success: true,
      data: {
        eventId: result.event.event_id,
        batchId: result.batchId,
        batchCode: result.batchCode,
        message: 'Inbound stock logged successfully with batch created',
      },
    });
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to log inbound',
      500
    );
  }
};

export const requestDispatchValidation = [
  body('cropType').isIn(Object.values(CropType)).withMessage('Invalid crop type'),
  body('bags').isInt({ min: 1 }).withMessage('Bags must be positive integer'),
  body('recipientName').trim().notEmpty().withMessage('Recipient name is required'),
  body('notes').optional().isString(),
];

/**
 * Request dispatch
 * POST /api/attendant/requests
 */
export const requestDispatch = async (req: Request, res: Response): Promise<void> => {
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

    const { cropType, bags, recipientName, notes } = req.body;

    const result = await outboundService.requestDispatch(
      req.user.warehouse_id,
      req.user.user_id,
      cropType,
      bags,
      recipientName,
      notes
    );

    res.json({
      success: true,
      data: {
        requestId: result.requestId,
        eventId: result.eventId,
        message: 'Dispatch request created successfully',
      },
    });
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to request dispatch',
      500
    );
  }
};

/**
 * Get attendant's requests
 * GET /api/attendant/requests
 */
export const getMyRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.warehouse_id || !req.user?.user_id) {
      throw new AppError('Not authenticated properly', 401);
    }

    const requests = await outboundService.getAttendantRequests(
      req.user.user_id,
      req.user.warehouse_id
    );

    res.json({
      success: true,
      data: requests,
    });
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to get requests',
      500
    );
  }
};

export const executeDispatchValidation = [
  body('photoBase64').notEmpty().withMessage('Photo is required'),
];

/**
 * Execute approved dispatch
 * POST /api/attendant/requests/:requestId/execute
 */
export const executeDispatch = async (req: Request, res: Response): Promise<void> => {
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
      throw new AppError('Not authenticated', 401);
    }

    const { requestId } = req.params;
    const { photoBase64 } = req.body;

    // Save photo (for now, using base64 - in production, upload to S3)
    const photoUrl = `data:image/jpeg;base64,${photoBase64}`;

    const result = await outboundService.executeDispatch(
      requestId,
      req.user.user_id,
      photoUrl
    );

    res.json({
      success: true,
      data: {
        eventId: result.eventId,
        newStockLevel: result.newStockLevel,
        message: 'Dispatch executed successfully',
      },
    });
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to execute dispatch',
      500
    );
  }
};

/**
 * Get attendant's assigned tools
 * GET /api/attendant/tools
 */
export const getMyTools = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.user_id) {
      throw new AppError('User not authenticated', 401);
    }

    const tools = await toolService.getAttendantTools(req.user.user_id);

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
 * Return a tool
 * POST /api/attendant/tools/:toolId/return
 */
export const returnToolValidation = [
  body('conditionNotes').optional().isString(),
];

export const returnTool = async (req: Request, res: Response): Promise<void> => {
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
    const { conditionNotes } = req.body;

    const result = await toolService.returnTool(
      toolId,
      req.user.user_id,
      conditionNotes
    );

    res.json({
      success: true,
      data: {
        eventId: result.eventId,
        message: 'Tool returned successfully',
      },
    });
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to return tool',
      500
    );
  }
};

/**
 * Confirm payment received (for credit payments)
 * POST /api/attendant/requests/:requestId/confirm-payment
 */
export const confirmPaymentValidation = [
  body('photoUrls').optional().isArray(),
  body('notes').optional().isString(),
];

export const confirmPayment = async (req: Request, res: Response): Promise<void> => {
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

    const { requestId } = req.params;
    const { photoUrls, notes } = req.body;

    const result = await outboundService.confirmPayment(
      requestId,
      req.user.user_id,
      photoUrls,
      notes
    );

    res.json({
      success: true,
      data: {
        eventId: result.eventId,
        message: 'Payment confirmed successfully',
      },
    });
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to confirm payment',
      500
    );
  }
};

/**
 * Get farmers with outstanding recovery
 * GET /api/attendant/farmers-with-recovery
 */
export const getFarmersWithRecovery = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.warehouse_id) {
      throw new AppError('Warehouse not assigned', 400);
    }

    const warehouseId = req.user.warehouse_id;

    // Get farmers who have pending or partial recovery
    const result = await db.query(
      `SELECT DISTINCT
        f.id,
        f.name,
        f.phone,
        f.community,
        COUNT(sr.id) as pending_records,
        SUM(sr.expected_bags - COALESCE(rt.received_bags, 0)) as bags_outstanding
      FROM farmers f
      INNER JOIN service_records sr ON f.id = sr.farmer_id
      INNER JOIN recovery_tracking rt ON sr.id = rt.service_record_id
      WHERE f.warehouse_id = $1
        AND f.status = 'ACTIVE'
        AND rt.recovery_status IN ('PENDING', 'PARTIAL')
      GROUP BY f.id, f.name, f.phone, f.community
      HAVING SUM(sr.expected_bags - COALESCE(rt.received_bags, 0)) > 0
      ORDER BY f.name ASC`,
      [warehouseId]
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to get farmers',
      500
    );
  }
};

/**
 * Validation for recovery inbound
 */
export const recordRecoveryValidation = [
  body('serviceRecordId').optional().isUUID().withMessage('Invalid service record ID'),
  body('farmerId').isUUID().withMessage('Invalid farmer ID'),
  body('crop').isIn(Object.values(CropType)).withMessage('Invalid crop type'),
  body('bagsReceived').isInt({ min: 1 }).withMessage('Bags received must be positive integer'),
  body('notes').optional().isString(),
];

/**
 * POST /attendant/recovery-inbound
 * Record recovery inbound (linked to service record)
 * Attendants can now record recovery inbound just like field agents
 */
export const recordRecoveryInbound = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    let { serviceRecordId, farmerId, crop, bagsReceived, notes } = req.body;
    const attendantId = req.user?.user_id;
    const warehouseId = req.user?.warehouse_id;

    if (!attendantId || !warehouseId) {
      throw new AppError('Attendant or warehouse not identified', 400);
    }

    // Get field agent ID from farmer record
    const farmerResult = await db.query(
      'SELECT field_agent_id FROM farmers WHERE id = $1 AND warehouse_id = $2',
      [farmerId, warehouseId]
    );

    if (farmerResult.rows.length === 0) {
      throw new AppError('Farmer not found', 404);
    }

    const fieldAgentId = farmerResult.rows[0].field_agent_id;

    // If no serviceRecordId provided, find the most recent pending service record for this farmer
    if (!serviceRecordId && farmerId) {
      const serviceRecordResult = await db.query(
        `SELECT id FROM service_records 
         WHERE farmer_id = $1 AND warehouse_id = $2 AND recovery_status IN ('PENDING', 'HARVESTED', 'PARTIAL')
         ORDER BY created_at DESC
         LIMIT 1`,
        [farmerId, warehouseId]
      );
      
      if (serviceRecordResult.rows.length === 0) {
        throw new AppError('No pending service records found for this farmer', 404);
      }
      
      serviceRecordId = serviceRecordResult.rows[0].id;
    }

    const result = await outgrowerService.recordRecoveryInbound(
      serviceRecordId,
      farmerId,
      fieldAgentId,
      warehouseId,
      crop,
      bagsReceived,
      attendantId, // createdBy - attendant ID
      notes
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Validation for aggregated inbound
 */
export const recordAggregatedValidation = [
  body('farmerId').isUUID().withMessage('Invalid farmer ID'),
  body('crop').isIn(Object.values(CropType)).withMessage('Invalid crop type'),
  body('bags').isInt({ min: 1 }).withMessage('Bags must be positive integer'),
  body('notes').optional().isString(),
];

/**
 * POST /attendant/aggregated-inbound
 * Record aggregated inbound (independent of service)
 * Attendants can now record aggregated inbound just like field agents
 */
export const recordAggregatedInbound = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const { farmerId, crop, bags, notes } = req.body;
    const attendantId = req.user?.user_id;
    const warehouseId = req.user?.warehouse_id;

    if (!attendantId || !warehouseId) {
      throw new AppError('Attendant or warehouse not identified', 400);
    }

    // Get field agent ID from farmer record
    const farmerResult = await db.query(
      'SELECT field_agent_id FROM farmers WHERE id = $1 AND warehouse_id = $2',
      [farmerId, warehouseId]
    );

    if (farmerResult.rows.length === 0) {
      throw new AppError('Farmer not found', 404);
    }

    const fieldAgentId = farmerResult.rows[0].field_agent_id;

    const result = await outgrowerService.recordAggregatedInbound(
      farmerId,
      fieldAgentId,
      warehouseId,
      crop,
      bags,
      attendantId, // createdBy - attendant ID
      notes
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    throw error;
  }
};
