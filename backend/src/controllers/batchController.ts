import { Request, Response } from 'express';
import { query, body, validationResult } from 'express-validator';
import batchService from '../services/BatchService';
import qrCodeService from '../services/QRCodeService';
import logger from '../config/logger';
import { AppError } from '../middleware/errorHandler';
import { CropType } from '../types/enums';

/**
 * Batch Controller
 * OWNER role endpoints for batch management
 * - View active batches
 * - View batch details with QR code
 * - Get QR code image
 * - View batch allocations and history
 */

/**
 * Get all batches for warehouse
 * GET /api/owner/batches
 */
export const getBatchesValidation = [
  query('crop').optional().isIn(Object.values(CropType)),
  query('available').optional().isBoolean(),
];

export const getBatches = async (req: Request, res: Response): Promise<void> => {
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
    if (!req.user?.warehouse_id) {
      throw new AppError('Warehouse not assigned', 400);
    }

    const { crop, available } = req.query;

    const batches = await batchService.getWarehouseBatches(
      req.user.warehouse_id,
      crop as CropType,
      available === 'true'
    );

    res.json({
      success: true,
      data: batches,
    });
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to get batches',
      500
    );
  }
};

/**
 * Get batch by ID
 * GET /api/owner/batches/:batchId
 */
export const getBatchById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { batchId } = req.params;

    const batch = await batchService.getBatchById(batchId);

    if (!batch) {
      throw new AppError('Batch not found', 404);
    }

    // Verify owner has access to this warehouse
    if (batch.warehouse_id !== req.user?.warehouse_id) {
      throw new AppError('Access denied to this batch', 403);
    }

    res.json({
      success: true,
      data: batch,
    });
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to get batch',
      500
    );
  }
};

/**
 * Get batch QR code
 * GET /api/owner/batches/:batchId/qr
 */
export const getBatchQRCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { batchId } = req.params;

    const batch = await batchService.getBatchById(batchId);

    if (!batch) {
      throw new AppError('Batch not found', 404);
    }

    // Verify owner has access
    if (batch.warehouse_id !== req.user?.warehouse_id) {
      throw new AppError('Access denied to this batch', 403);
    }

    if (!batch.qr_code_data) {
      throw new AppError('QR code not generated for this batch', 404);
    }

    // Return QR code as base64 data URL
    res.json({
      success: true,
      data: {
        qr_code: batch.qr_code_data,
        batch_code: batch.batch_code,
        crop_type: batch.crop_type,
      },
    });
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to get QR code',
      500
    );
  }
};

/**
 * Get batch allocations (which requests used this batch)
 * GET /api/owner/batches/:batchId/allocations
 */
export const getBatchAllocations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { batchId } = req.params;

    const batch = await batchService.getBatchById(batchId);

    if (!batch) {
      throw new AppError('Batch not found', 404);
    }

    // Verify owner has access
    if (batch.warehouse_id !== req.user?.warehouse_id) {
      throw new AppError('Access denied to this batch', 403);
    }

    // Get allocations from batch_allocations table
    const allocations = await batchService.getRequestBatchAllocations(batchId);

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
 * Scan batch QR code (Attendant during dispatch execution)
 * POST /api/attendant/batch/scan
 */
export const scanBatchValidation = [
  body('requestId').notEmpty().withMessage('Request ID is required'),
  body('scannedData').notEmpty().withMessage('Scanned QR data is required'),
  body('bagsLoaded').isInt({ min: 1 }).withMessage('Bags loaded must be a positive integer'),
];

export const scanBatch = async (req: Request, res: Response): Promise<void> => {
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

    const { requestId, scannedData, bagsLoaded } = req.body;

    // Verify scanned QR code
    const verification = qrCodeService.verifyBatchQRData(scannedData);

    if (!verification.valid) {
      throw new AppError(verification.error || 'Invalid QR code', 400);
    }

    const batchId = verification.batchId!;

    // Verify batch is allocated to this request
    const batchVerification = await batchService.verifyBatchForDispatch(
      batchId,
      requestId,
      bagsLoaded
    );

    if (!batchVerification.valid) {
      throw new AppError(batchVerification.error || 'Batch verification failed', 400);
    }

    // Record the scan
    await batchService.recordBatchScan(
      batchId,
      requestId,
      req.user.user_id,
      bagsLoaded
    );

    res.json({
      success: true,
      data: {
        batchId,
        verified: true,
        message: 'Batch scanned and verified successfully',
      },
    });
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : 'Batch scan failed',
      500
    );
  }
};

/**
 * Verify batch by code (Attendant QR verification)
 * GET /api/attendant/batch/verify/:batchCode
 */
export const verifyBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { batchCode } = req.params;

    logger.info('🔍 Attendant QR Verification', { batchCode, attendantId: req.user?.user_id });

    if (!req.user?.warehouse_id) {
      throw new AppError('Warehouse not assigned', 400);
    }

    const batch = await batchService.getBatchByCode(batchCode);

    logger.info('📦 Batch Lookup', { found: !!batch, batchCode });

    if (!batch) {
      logger.warn('❌ Batch not found', { batchCode });
      res.status(404).json({
        success: false,
        error: 'Batch not found',
      });
      return;
    }

    // Verify batch belongs to attendant's warehouse
    if (batch.warehouse_id !== req.user.warehouse_id) {
      logger.warn('❌ Warehouse mismatch', { 
        batchWarehouse: batch.warehouse_id, 
        attendantWarehouse: req.user.warehouse_id 
      });
      res.status(403).json({
        success: false,
        error: 'Batch does not belong to your warehouse',
      });
      return;
    }

    logger.info('✅ Batch Verified', { batchCode, batchId: batch.id });
    res.json({
      success: true,
      data: batch,
    });
  } catch (error) {
    logger.error('❌ Batch Verification Error', error);
    throw new AppError(
      error instanceof Error ? error.message : 'Batch verification failed',
      500
    );
  }
};
