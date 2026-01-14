import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import authService from '../services/AuthService';
import { AppError } from '../middleware/errorHandler';

/**
 * Auth Controller
 * Handles login, registration, token refresh
 */

export const loginValidation = [
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('pin').notEmpty().withMessage('PIN is required'),
];

export const login = async (req: Request, res: Response): Promise<void> => {
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
    const { phone, pin, role } = req.body;
    console.log('Login attempt:', { phone, pin: '****', role, phoneLength: phone?.length });
    const result = await authService.login(phone, pin);

    res.json({
      success: true,
      data: {
        user: {
          id: result.user.id,
          name: result.user.name,
          phone: result.user.phone,
          role: result.user.role,
        },
        warehouse: result.warehouse,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  } catch (error) {
    console.error('Login error:', error instanceof Error ? error.message : 'Login failed');
    res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : 'Login failed',
    });
  }
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError('Refresh token required', 400);
    }

    const newAccessToken = await authService.refreshToken(refreshToken);

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (error) {
    throw new AppError(error instanceof Error ? error.message : 'Token refresh failed', 401);
  }
};

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const user = await authService.getUserById(req.user.user_id);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({
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
    throw new AppError(error instanceof Error ? error.message : 'Failed to get profile', 500);
  }
};
