import { Router } from 'express';
import authRoutes from './authRoutes';
// Import other routes as they're created
// import adminRoutes from './adminRoutes';
// import attendantRoutes from './attendantRoutes';
// import ownerRoutes from './ownerRoutes';

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
// router.use('/admin', adminRoutes);
// router.use('/attendant', attendantRoutes);
// router.use('/owner', ownerRoutes);

export default router;
