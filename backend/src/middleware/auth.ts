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

/**
 * AUTHORITATIVE SPEC GUARDS
 * Enforce separation of duties per authoritative specification
 */

/**
 * Prevent Platform Admin from managing warehouse staff
 * Per spec: "Platform Admin CANNOT add attendants or field agents"
 */
export const preventPlatformAdminStaffManagement = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.user?.role === UserRole.PLATFORM_ADMIN) {
    res.status(403).json({
      success: false,
      error: 'Platform Admin cannot manage warehouse staff. Only Owner can add/remove attendants and field agents.',
    });
    return;
  }
  next();
};

/**
 * Prevent non-Owners from setting prices
 * Per spec: "Only Owners set prices"
 */
export const requireOwnerForPricing = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.user?.role !== UserRole.OWNER) {
    res.status(403).json({
      success: false,
      error: 'Only warehouse owners can set prices. Field Agents and Attendants cannot access pricing.',
    });
    return;
  }
  next();
};

/**
 * Prevent Field Agents from accessing financial data
 * Per spec: "Field Agents CANNOT see prices, revenue, or profit"
 */
export const preventFieldAgentFinancialAccess = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.user?.role === UserRole.FIELD_AGENT) {
    res.status(403).json({
      success: false,
      error: 'Field Agents cannot access pricing, revenue, or profit information.',
    });
    return;
  }
  next();
};

/**
 * Prevent Attendants from accessing analytics
 * Per spec: "Attendants CANNOT view profit or analytics"
 */
export const preventAttendantAnalytics = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.user?.role === UserRole.ATTENDANT) {
    res.status(403).json({
      success: false,
      error: 'Attendants cannot access analytics or profit data.',
    });
    return;
  }
  next();
};

/**
 * Prevent Field Agents from touching stock
 * Per spec: "Field Agents CANNOT touch warehouse stock"
 */
export const preventFieldAgentStockAccess = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.user?.role === UserRole.FIELD_AGENT) {
    res.status(403).json({
      success: false,
      error: 'Field Agents cannot record warehouse stock. Only Attendants can log inbound/outbound.',
    });
    return;
  }
  next();
};

/**
 * Prevent Owners from physically handling stock
 * Per spec: "Owner CANNOT physically receive stock"
 */
export const preventOwnerPhysicalStock = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.user?.role === UserRole.OWNER) {
    res.status(403).json({
      success: false,
      error: 'Owners cannot physically handle stock. Only Attendants can record inbound/execute dispatch.',
    });
    return;
  }
  next();
};
