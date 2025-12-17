import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * POST /auth/login
 * Public endpoint for user login
 */
router.post('/login', authController.loginValidation, authController.login);

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', authController.refreshToken);

/**
 * GET /auth/profile
 * Get current user profile (requires authentication)
 */
router.get('/profile', authenticate, authController.getProfile);

export default router;
