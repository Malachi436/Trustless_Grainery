import { Request, Response, NextFunction } from 'express';
import authService from '../services/AuthService';
import { UserRole } from '../types/enums';
import { TokenPayload } from '../types/models';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Authenticate JWT token
 * Extracts and verifies token, attaches user to request
 */
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'No token provided',
      });
      return;
    }

    const token = authHeader.substring(7);
    const payload = authService.verifyToken(token);

    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
};

/**
 * Authorize specific roles
 * Use after authenticate middleware
 */
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
      });
      return;
    }

    next();
  };
};

/**
 * Require warehouse context
 * Ensures user belongs to a warehouse
 */
export const requireWarehouse = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user?.warehouse_id) {
    res.status(403).json({
      success: false,
      error: 'No warehouse assigned to user',
    });
    return;
  }

  next();
};

/**
 * Require specific warehouse
 * Validates user can access the requested warehouse
 */
export const requireWarehouseAccess = (warehouseIdParam: string = 'warehouseId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestedWarehouseId = req.params[warehouseIdParam] || req.body.warehouse_id;

    if (!requestedWarehouseId) {
      res.status(400).json({
        success: false,
        error: 'Warehouse ID required',
      });
      return;
    }

    // Platform admin can access all warehouses
    if (req.user?.role === UserRole.PLATFORM_ADMIN) {
      next();
      return;
    }

    // Others can only access their assigned warehouse
    if (req.user?.warehouse_id !== requestedWarehouseId) {
      res.status(403).json({
        success: false,
        error: 'Access denied to this warehouse',
      });
      return;
    }

    next();
  };
};
