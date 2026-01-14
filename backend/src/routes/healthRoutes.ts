import { Router, Request, Response } from 'express';
import db from '../config/database';
import os from 'os';

const router = Router();

/**
 * Health check endpoint
 * Used by PM2, load balancers, and monitoring tools
 * GET /health
 */
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    
    // Check database connectivity
    await db.query('SELECT 1');
    const dbResponseTime = Date.now() - startTime;
    
    // Check if response time is acceptable (under 100ms)
    const dbHealthy = dbResponseTime < 100;
    
    const healthStatus = {
      status: dbHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      database: {
        connected: true,
        responseTime: `${dbResponseTime}ms`,
      },
      system: {
        memory: {
          used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
          total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
        },
        cpu: os.loadavg()[0].toFixed(2),
        platform: os.platform(),
      },
    };
    
    res.status(dbHealthy ? 200 : 503).json(healthStatus);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed',
      database: {
        connected: false,
      },
    });
  }
});

/**
 * Readiness check
 * Returns 200 only when system is fully ready to accept requests
 * GET /ready
 */
router.get('/ready', async (_req: Request, res: Response) => {
  try {
    // Check database
    await db.query('SELECT 1');
    
    // Check critical tables exist
    const tables = ['users', 'warehouses', 'events', 'batches'];
    for (const table of tables) {
      await db.query(`SELECT 1 FROM ${table} LIMIT 1`);
    }
    
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
