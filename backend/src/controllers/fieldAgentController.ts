import { Request, Response } from 'express';
import { body, validationResult, param } from 'express-validator';
import fieldAgentService from '../services/FieldAgentService';
import outgrowerService from '../services/OutgrowerService';
import { ServiceType, CropType } from '../types/enums';
import { AppError } from '../middleware/errorHandler';

/**
 * Field Agent Controller
 * 
 * Endpoints for Field Agents to:
 * - Manage farmers
 * - Record services
 * - Mark harvests complete
 * - View expected inventory
 */

// ============================================
// VALIDATION MIDDLEWARE
// ============================================

export const createFarmerValidation = [
  body('name').notEmpty().withMessage('Farmer name required'),
  body('phone').optional(),
  body('community').optional(),
];

export const recordServiceValidation = [
  param('farmerId').isUUID().withMessage('Invalid farmer ID'),
  body('serviceTypes').isArray().withMessage('Service types must be array'),
  body('expectedBags').isInt({ min: 1 }).withMessage('Expected bags must be positive integer'),
  body('landSizeAcres').optional().isNumeric(),
  body('fertilizerQuantityKg').optional().isNumeric(),
  body('pesticideQuantityLiters').optional().isNumeric(),
];

export const recordRecoveryValidation = [
  param('farmerId').isUUID().withMessage('Invalid farmer ID'),
  body('serviceRecordId').isUUID().withMessage('Invalid service record ID'),
  body('crop').isIn(Object.values(CropType)).withMessage('Invalid crop type'),
  body('bagsReceived').isInt({ min: 1 }).withMessage('Bags received must be positive integer'),
];

export const recordAggregatedValidation = [
  param('farmerId').isUUID().withMessage('Invalid farmer ID'),
  body('crop').isIn(Object.values(CropType)).withMessage('Invalid crop type'),
  body('bags').isInt({ min: 1 }).withMessage('Bags must be positive integer'),
];

// ============================================
// ENDPOINTS
// ============================================

/**
 * POST /field-agent/farmers
 * Create a new farmer (Field Agent)
 */
export const createFarmer = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const { name, phone, community } = req.body;
    const fieldAgentId = req.user?.user_id;
    const warehouseId = req.user?.warehouse_id;

    if (!fieldAgentId || !warehouseId) {
      throw new AppError('Field agent or warehouse not identified', 400);
    }

    const farmer = await fieldAgentService.createFarmer(
      fieldAgentId,
      warehouseId,
      name,
      phone,
      community,
      fieldAgentId
    );

    res.json({
      success: true,
      data: farmer,
    });
  } catch (error) {
    throw error;
  }
};

/**
 * GET /field-agent/farmers
 * List all farmers for this field agent + warehouse
 */
export const listFarmers = async (req: Request, res: Response): Promise<void> => {
  try {
    const fieldAgentId = req.user?.user_id;
    const warehouseId = req.user?.warehouse_id;

    if (!fieldAgentId || !warehouseId) {
      throw new AppError('Field agent or warehouse not identified', 400);
    }

    const farmers = await fieldAgentService.getFarmers(fieldAgentId, warehouseId);

    res.json({
      success: true,
      data: farmers,
    });
  } catch (error) {
    throw error;
  }
};

/**
 * POST /field-agent/farmers/:farmerId/services
 * Record services provided to a farmer
 */
export const recordService = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const { farmerId } = req.params;
    const {
      serviceTypes,
      landServices,
      landSizeAcres,
      fertilizerType,
      fertilizerQuantityKg,
      pesticideType,
      pesticideQuantityLiters,
      expectedBags,
    } = req.body;

    const fieldAgentId = req.user?.user_id;
    const warehouseId = req.user?.warehouse_id;

    if (!fieldAgentId || !warehouseId) {
      throw new AppError('Field agent or warehouse not identified', 400);
    }

    const result = await fieldAgentService.recordService(
      farmerId,
      fieldAgentId,
      warehouseId,
      serviceTypes as ServiceType[],
      expectedBags,
      landServices,
      landSizeAcres,
      fertilizerType,
      fertilizerQuantityKg,
      pesticideType,
      pesticideQuantityLiters,
      fieldAgentId
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
 * POST /field-agent/farmers/:farmerId/harvest-complete
 * Mark harvest as completed
 */
export const markHarvestComplete = async (req: Request, res: Response): Promise<void> => {
  try {
    const { farmerId } = req.params;
    const { serviceRecordId, notes } = req.body;

    if (!serviceRecordId) {
      throw new AppError('Service record ID required', 400);
    }

    const fieldAgentId = req.user?.user_id;
    const warehouseId = req.user?.warehouse_id;

    if (!fieldAgentId || !warehouseId) {
      throw new AppError('Field agent or warehouse not identified', 400);
    }

    const result = await fieldAgentService.markHarvestComplete(
      serviceRecordId,
      farmerId,
      fieldAgentId,
      warehouseId,
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
 * GET /field-agent/farmers/:farmerId/services
 * Get farmer's service records and recovery status
 */
export const getFarmerRecords = async (req: Request, res: Response): Promise<void> => {
  try {
    const { farmerId } = req.params;
    const warehouseId = req.user?.warehouse_id;

    if (!warehouseId) {
      throw new AppError('Warehouse not identified', 400);
    }

    const records = await fieldAgentService.getFarmerRecords(farmerId, warehouseId);
    const recoveryStatus = await outgrowerService.getFarmerRecoveryStatus(farmerId, warehouseId);

    res.json({
      success: true,
      data: {
        serviceRecords: records,
        recoveryStatus,
      },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * GET /field-agent/expected-inventory
 * Get expected inventory projection
 */
export const getExpectedInventory = async (req: Request, res: Response): Promise<void> => {
  try {
    const warehouseId = req.user?.warehouse_id;

    if (!warehouseId) {
      throw new AppError('Warehouse not identified', 400);
    }

    const inventory = await fieldAgentService.getExpectedInventory(warehouseId);

    res.json({
      success: true,
      data: inventory,
    });
  } catch (error) {
    throw error;
  }
};

/**
 * POST /field-agent/recovery-inbound
 * Record recovery inbound (from service record)
 */
export const recordRecoveryInbound = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const { serviceRecordId, farmerId, crop, bagsReceived, notes } = req.body;
    const fieldAgentId = req.user?.user_id;
    const warehouseId = req.user?.warehouse_id;

    if (!fieldAgentId || !warehouseId) {
      throw new AppError('Field agent or warehouse not identified', 400);
    }

    const result = await outgrowerService.recordRecoveryInbound(
      serviceRecordId,
      farmerId,
      fieldAgentId,
      warehouseId,
      crop,
      bagsReceived,
      fieldAgentId,
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
 * POST /field-agent/aggregated-inbound
 * Record aggregated inbound (independent of service)
 */
export const recordAggregatedInbound = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const { farmerId, crop, bags, notes } = req.body;
    const fieldAgentId = req.user?.user_id;
    const warehouseId = req.user?.warehouse_id;

    if (!fieldAgentId || !warehouseId) {
      throw new AppError('Field agent or warehouse not identified', 400);
    }

    const result = await outgrowerService.recordAggregatedInbound(
      farmerId,
      fieldAgentId,
      warehouseId,
      crop,
      bags,
      fieldAgentId,
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
