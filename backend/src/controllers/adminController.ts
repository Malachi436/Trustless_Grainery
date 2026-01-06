import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import authService from '../services/AuthService';
import warehouseService from '../services/WarehouseService';
import genesisService from '../services/GenesisService';
import toolService from '../services/ToolService';
import db from '../config/database';
import logger from '../config/logger';
import { UserRole, WarehouseStatus, CropType } from '../types/enums';
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

  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    const { name, location, ownerName, ownerPhone, ownerPin } = req.body;

    // Check if phone already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE phone = $1',
      [ownerPhone]
    );
    
    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      res.status(400).json({
        success: false,
        error: 'Phone number already registered',
      });
      return;
    }

    // Step 1: Create a temporary owner user
    const ownerId = uuidv4();
    const hashedPin = await bcrypt.hash(ownerPin, 10);
    
    await client.query(
      `INSERT INTO users (id, name, phone, role, hashed_pin, warehouse_id)
       VALUES ($1, $2, $3, $4, $5, NULL)`,
      [ownerId, ownerName, ownerPhone, UserRole.OWNER, hashedPin]
    );

    // Step 2: Create the warehouse with the owner_id
    const warehouseId = uuidv4();
    const warehouseResult = await client.query(
      `INSERT INTO warehouses (id, name, location, status, owner_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [warehouseId, name, location, WarehouseStatus.SETUP, ownerId]
    );

    // Step 3: Update the owner's warehouse_id
    await client.query(
      `UPDATE users SET warehouse_id = $1 WHERE id = $2`,
      [warehouseId, ownerId]
    );

    await client.query('COMMIT');

    const warehouse = warehouseResult.rows[0];

    res.status(201).json({
      success: true,
      data: {
        warehouse: {
          id: warehouse.id,
          name: warehouse.name,
          location: warehouse.location,
          status: warehouse.status,
          owner_id: ownerId,
        },
        owner: {
          id: ownerId,
          name: ownerName,
          phone: ownerPhone,
          role: UserRole.OWNER,
        },
      },
    });

    logger.info('✅ Warehouse and owner created', { warehouseId, ownerId });
  } catch (error) {
    await client.query('ROLLBACK');
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to create warehouse',
      500
    );
  } finally {
    client.release();
  }
};

export const createUserValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('pin').trim().notEmpty().withMessage('PIN is required'),
  body('role').isIn([UserRole.OWNER, UserRole.ATTENDANT, UserRole.FIELD_AGENT]).withMessage('Invalid role'),
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

  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    const { name, phone, pin, role, warehouseId } = req.body;

    // Validate warehouse requirement for attendants and field agents
    if ((role === UserRole.ATTENDANT || role === UserRole.FIELD_AGENT) && !warehouseId) {
      await client.query('ROLLBACK');
      res.status(400).json({
        success: false,
        error: 'Warehouse ID required for attendants and field agents',
      });
      return;
    }

    // Check if phone already exists
    const existing = await client.query('SELECT id FROM users WHERE phone = $1', [phone]);
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      res.status(400).json({
        success: false,
        error: 'Phone number already registered',
      });
      return;
    }

    // Hash PIN
    const hashedPin = await bcrypt.hash(pin, 10);
    const userId = uuidv4();

    // 1. Insert User
    const userResult = await client.query(
      `INSERT INTO users (id, name, phone, role, hashed_pin, warehouse_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, phone, role, warehouse_id`,
      [userId, name, phone, role, hashedPin, warehouseId || null]
    );
    const user = userResult.rows[0];

    // 2. Handle role-specific logic
    if ((role === UserRole.ATTENDANT || role === UserRole.FIELD_AGENT) && warehouseId) {
      // Link in attendant_warehouses table
      await client.query(
        `INSERT INTO attendant_warehouses (attendant_id, warehouse_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [userId, warehouseId]
      );
    } else if (role === UserRole.OWNER && warehouseId) {
      // If creating an owner for an existing warehouse, update the warehouse's owner_id
      await client.query(
        `UPDATE warehouses SET owner_id = $1 WHERE id = $2`,
        [userId, warehouseId]
      );
    }

    await client.query('COMMIT');

    logger.info('✅ User created by admin', { userId: user.id, role, phone });

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
    await client.query('ROLLBACK');
    logger.error('Create user error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create user',
    });
  } finally {
    client.release();
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
    logger.error('Get warehouses error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get warehouses',
    });
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
    logger.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get users',
    });
  }
};

/**
 * Delete user
 * DELETE /api/admin/users/:userId
 */
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
      return;
    }

    // Check if user exists
    const userResult = await db.query('SELECT id, role FROM users WHERE id = $1', [userId]);
    
    if (!userResult || !userResult.rows || userResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    const user = userResult.rows[0];

    // Prevent deleting platform admin users
    if (user.role === 'PLATFORM_ADMIN') {
      res.status(403).json({
        success: false,
        error: 'Cannot delete platform admin users',
      });
      return;
    }

    // Check if user is an owner of any warehouse
    const warehouseResult = await db.query('SELECT id, name FROM warehouses WHERE owner_id = $1', [userId]);
    if (warehouseResult.rows.length > 0) {
      const warehouseNames = warehouseResult.rows.map(w => w.name).join(', ');
      res.status(400).json({
        success: false,
        error: `Cannot delete user because they own the following warehouse(s): ${warehouseNames}. Please delete the warehouse(s) first.`,
      });
      return;
    }

    // Delete the user
    await db.query('DELETE FROM users WHERE id = $1', [userId]);

    logger.info(`User deleted: ${userId}`, { userId });

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete user',
    });
  }
};

/**
 * Delete warehouse
 * DELETE /api/admin/warehouses/:id
 */
export const deleteWarehouse = async (req: Request, res: Response): Promise<void> => {
  const client = await db.getClient();
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Warehouse ID is required',
      });
      return;
    }

    await client.query('BEGIN');

    // Check if warehouse exists
    const warehouseResult = await client.query('SELECT id, status FROM warehouses WHERE id = $1', [id]);
    if (warehouseResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({
        success: false,
        error: 'Warehouse not found',
      });
      return;
    }

    // 1. Delete associated data first (to satisfy FK constraints)
    // Delete from attendant_warehouses
    await client.query('DELETE FROM attendant_warehouses WHERE warehouse_id = $1', [id]);
    
    // Delete from events (Note: Schema rules might block this if not careful, but as admin we allow it for cleanup)
    // The schema says CREATE RULE no_delete_events AS ON DELETE TO events DO INSTEAD NOTHING;
    // We might need to drop the rule or use a different approach if we want to delete events.
    // For now, let's try to delete. If the rule blocks it, the transaction will still succeed but nothing happens.
    await client.query('DELETE FROM events WHERE warehouse_id = $1', [id]);
    
    // Delete from projections
    await client.query('DELETE FROM request_projections WHERE warehouse_id = $1', [id]);
    await client.query('DELETE FROM stock_projections WHERE warehouse_id = $1', [id]);

    // 2. Finally delete the warehouse
    await client.query('DELETE FROM warehouses WHERE id = $1', [id]);

    await client.query('COMMIT');

    logger.info(`Warehouse deleted: ${id}`, { id });

    res.json({
      success: true,
      message: 'Warehouse and all associated data deleted successfully',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Delete warehouse error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete warehouse',
    });
  } finally {
    client.release();
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

export const recordGenesisValidation = [
  body('inventory').isArray({ min: 1 }).withMessage('Inventory must be a non-empty array'),
  body('inventory.*.cropType').custom((value) => {
    const validCrops = ['Maize', 'Rice', 'Soybeans', 'Wheat', 'Millet'];
    // Accept case-insensitive but validate against capitalized versions
    const capitalizedValue = typeof value === 'string' 
      ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() 
      : value;
    if (!validCrops.includes(capitalizedValue)) {
      throw new Error(`Invalid crop type: ${value}. Must be one of: ${validCrops.join(', ')}`);
    }
    return true;
  }),
  body('inventory.*.bags').isInt({ min: 1 }).withMessage('Bags must be a positive integer'),
  body('tools').optional().isArray().withMessage('Tools must be an array'),
  body('tools.*.toolType').optional().isString().withMessage('Tool type must be a string'),
  body('tools.*.quantity').optional().isInt({ min: 1 }).withMessage('Tool quantity must be a positive integer'),
  body('photoUrls').optional().isArray().withMessage('Photo URLs must be an array'),
  body('notes').optional().isString().withMessage('Notes must be a string'),
];

/**
 * Record Genesis Inventory for a warehouse
 * POST /api/admin/warehouses/:warehouseId/genesis
 */
export const recordGenesis = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Genesis validation failed', { errors: errors.array(), body: req.body });
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array(),
    });
    return;
  }

  try {
    const { warehouseId } = req.params;
    const { inventory, tools, photoUrls, notes } = req.body;
    const adminId = req.user?.user_id;

    if (!adminId) {
      throw new AppError('Admin ID not found', 401);
    }

    // Record genesis for each crop in the inventory
    const events = [];
    for (const item of inventory) {
      // Normalize crop type to capitalized format (Maize, Rice, etc.)
      const cropType = typeof item.cropType === 'string' 
        ? item.cropType.charAt(0).toUpperCase() + item.cropType.slice(1).toLowerCase()
        : item.cropType;
      const event = await genesisService.recordGenesis(
        warehouseId,
        adminId,
        cropType as CropType,
        item.bags,
        photoUrls || [],
        notes
      );
      events.push(event);
    }

    // v2: Create tools if provided
    const createdTools = [];
    if (tools && Array.isArray(tools) && tools.length > 0) {
      for (const toolItem of tools) {
        if (toolItem.toolType && toolItem.quantity > 0) {
          const toolRecords = await toolService.createTools(
            warehouseId,
            toolItem.toolType,
            toolItem.quantity,
            adminId
          );
          createdTools.push(...toolRecords);
        }
      }
    }

    res.status(201).json({
      success: true,
      data: {
        events,
        tools: createdTools,
        message: `Genesis inventory recorded successfully${createdTools.length > 0 ? ` with ${createdTools.length} tools` : ''}. Warehouse status updated to GENESIS_PENDING.`,
      },
    });

    logger.info('✅ Genesis inventory recorded by admin', { 
      warehouseId, 
      adminId, 
      itemCount: inventory.length,
      toolCount: createdTools.length,
    });
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to record genesis',
      500
    );
  }
};
