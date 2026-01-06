import { Router } from 'express';
import authRoutes from './authRoutes';
import adminRoutes from './adminRoutes';
import attendantRoutes from './attendantRoutes';
import ownerRoutes from './ownerRoutes';
import ownerAnalyticsRoutes from './ownerAnalyticsRoutes';
import fieldAgentRoutes from './fieldAgentRoutes';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Trustless Granary API is running',
    timestamp: new Date().toISOString(),
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/attendant', attendantRoutes);
router.use('/owner', ownerRoutes);
router.use('/owner/analytics', ownerAnalyticsRoutes);
router.use('/field-agent', fieldAgentRoutes);

export default router;
