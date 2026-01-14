import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * General API rate limiter
 * Applies to all API endpoints unless overridden
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per IP
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again after 15 minutes',
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Too many requests, please slow down',
      retryAfter: '15 minutes',
    });
  },
});

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute-force attacks
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Only 5 login attempts per 15 minutes
  skipSuccessfulRequests: true, // Don't count successful logins
  message: {
    success: false,
    error: 'Too many login attempts from this IP, please try again after 15 minutes',
  },
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Account temporarily locked due to too many failed login attempts',
      retryAfter: '15 minutes',
    });
  },
});

/**
 * Moderate rate limiter for resource-intensive operations
 * QR code generation, PDF exports, image uploads
 */
export const heavyOperationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 operations per 5 minutes
  message: {
    success: false,
    error: 'Too many resource-intensive requests, please try again later',
  },
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded for this operation',
      retryAfter: '5 minutes',
    });
  },
});

/**
 * Lenient rate limiter for read-only operations
 * Dashboard views, stats, lists
 */
export const readOnlyLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  skipSuccessfulRequests: false,
  message: {
    success: false,
    error: 'Too many requests, please slow down',
  },
});
