import { Router } from 'express';
import * as adminController from '../controllers/adminController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types/enums';

const router = Router();

// All admin routes require PLATFORM_ADMIN role
router.use(authenticate, authorize(UserRole.PLATFORM_ADMIN));

/**
 * POST /admin/warehouses
 * Create new warehouse with owner
 */
router.post(
  '/warehouses',
  adminController.createWarehouseValidation,
  adminController.createWarehouse
);

/**
 * GET /admin/warehouses
 * Get all warehouses
 */
router.get('/warehouses', adminController.getAllWarehouses);

/**
 * GET /admin/warehouses/:id
 * Get warehouse details
 */
router.get('/warehouses/:id', adminController.getWarehouseDetails);

/**
 * POST /admin/users
 * Create new user (Owner or Attendant)
 */
router.post('/users', adminController.createUserValidation, adminController.createUser);

/**
 * GET /admin/users
 * Get all users (optional query param: ?role=OWNER)
 */
router.get('/users', adminController.getAllUsers);

/**
 * POST /admin/warehouses/:warehouseId/genesis
 * Record genesis inventory for a warehouse
 */
router.post(
  '/warehouses/:warehouseId/genesis',
  adminController.recordGenesisValidation,
  adminController.recordGenesis
);

export default router;
