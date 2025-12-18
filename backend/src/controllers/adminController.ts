import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import authService from '../services/AuthService';
import warehouseService from '../services/WarehouseService';
import db from '../config/database';
import { UserRole, WarehouseStatus } from '../types/enums';
import { AppError } from '../middleware/errorHandler';

/**
 * Admin Controller
 * PLATFORM_ADMIN only endpoints
 * - Create warehouses
 * - Create users (Owner, Attendant)
 * - View system-wide data
 */

export const createWarehouseValidation = [
  body('name').trim().notEmpty().withMessage('Warehouse name is required'),
  body('location').trim().notEmpty().withMessage('Location is required'),
  body('ownerName').trim().notEmpty().withMessage('Owner name is required'),
  body('ownerPhone').trim().notEmpty().withMessage('Owner phone is required'),
  body('ownerPin').trim().notEmpty().withMessage('Owner PIN is required'),
];

/**
 * Create new warehouse with owner
 * POST /api/admin/warehouses
 */
export const createWarehouse = async (req: Request, res: Response): Promise<void> => {
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
    const { name, location, ownerName, ownerPhone, ownerPin } = req.body;

    // Create warehouse with owner
    const result = await warehouseService.createWarehouse(
      name,
      location,
      ownerName,
      ownerPhone,
      ownerPin
    );

    res.status(201).json({
      success: true,
      data: {
        warehouse: result.warehouse,
        owner: {
          id: result.owner.id,
          name: result.owner.name,
          phone: result.owner.phone,
          role: result.owner.role,
        },
      },
    });
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to create warehouse',
      500
    );
  }
};

export const createUserValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('pin').trim().notEmpty().withMessage('PIN is required'),
  body('role').isIn([UserRole.OWNER, UserRole.ATTENDANT]).withMessage('Invalid role'),
  body('warehouseId').optional().isUUID().withMessage('Invalid warehouse ID'),
];

/**
 * Create new user (Owner or Attendant)
 * POST /api/admin/users
 */
export const createUser = async (req: Request, res: Response): Promise<void> => {
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
    const { name, phone, pin, role, warehouseId } = req.body;

    // Validate warehouse requirement for attendants
    if (role === UserRole.ATTENDANT && !warehouseId) {
      throw new AppError('Warehouse ID required for attendants', 400);
    }

    const user = await authService.createUser(name, phone, pin, role, warehouseId || null);

    // If attendant, assign to warehouse
    if (role === UserRole.ATTENDANT && warehouseId) {
      await authService.assignAttendantToWarehouse(user.id, warehouseId);
    }

    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        warehouse_id: user.warehouse_id,
      },
    });
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to create user',
      500
    );
  }
};

/**
 * Get all warehouses
 * GET /api/admin/warehouses
 */
export const getAllWarehouses = async (req: Request, res: Response): Promise<void> => {
  try {
    const warehouses = await warehouseService.getAllWarehouses();

    res.json({
      success: true,
      data: warehouses,
    });
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to get warehouses',
      500
    );
  }
};

/**
 * Get all users
 * GET /api/admin/users
 */
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { role } = req.query;

    let query = `
      SELECT u.id, u.name, u.phone, u.role, u.warehouse_id, u.created_at,
             w.name as warehouse_name
      FROM users u
      LEFT JOIN warehouses w ON u.warehouse_id = w.id
    `;

    const params: any[] = [];

    if (role) {
      query += ' WHERE u.role = $1';
      params.push(role);
    }

    query += ' ORDER BY u.created_at DESC';

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to get users',
      500
    );
  }
};

/**
 * Get warehouse details
 * GET /api/admin/warehouses/:id
 */
export const getWarehouseDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const warehouse = await warehouseService.getWarehouseById(id);

    if (!warehouse) {
      throw new AppError('Warehouse not found', 404);
    }

    res.json({
      success: true,
      data: warehouse,
    });
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to get warehouse',
      500
    );
  }
};
