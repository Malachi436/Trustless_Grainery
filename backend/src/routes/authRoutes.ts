import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * POST /auth/login
 * Public endpoint for user login
 * Rate limited: 5 attempts per 15 minutes
 */
router.post('/login', authLimiter, authController.loginValidation, authController.login);

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 * Rate limited: 5 attempts per 15 minutes
 */
router.post('/refresh', authLimiter, authController.refreshToken);

/**
 * GET /auth/profile
 * Get current user profile (requires authentication)
 */
router.get('/profile', authenticate, authController.getProfile);

export default router;
