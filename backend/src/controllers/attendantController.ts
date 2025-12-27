import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import inboundService from '../services/InboundService';
import outboundService from '../services/OutboundService';
import stockProjectionService from '../services/StockProjectionService';
import toolService from '../services/ToolService';
import { CropType } from '../types/enums';
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

    // Get current stock
    const stock = await stockProjectionService.getCurrentStock(warehouseId);

    // Get attendant's requests
    const myRequests = await outboundService.getAttendantRequests(
      req.user.user_id,
      warehouseId
    );

    res.json({
      success: true,
      data: {
        stock,
        myRequests: myRequests.slice(0, 5), // Last 5 requests
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
  body('photoBase64').notEmpty().withMessage('Photo is required'),
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

    const { cropType, bags, photoBase64, notes } = req.body;

    // Save photo (for now, using base64 - in production, upload to S3)
    const photoUrl = `data:image/jpeg;base64,${photoBase64}`;

    const result = await inboundService.logInbound(
      req.user.warehouse_id,
      req.user.user_id,
      cropType,
      bags,
      photoUrl,
      notes
    );

    res.json({
      success: true,
      data: {
        eventId: result.event.event_id,
        batchId: result.batchId,
        message: 'Inbound stock logged successfully',
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
