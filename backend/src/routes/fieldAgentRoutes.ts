import { Router } from 'express';
import * as fieldAgentController from '../controllers/fieldAgentController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types/enums';

const router = Router();

// All field agent routes require FIELD_AGENT role
router.use(authenticate, authorize(UserRole.FIELD_AGENT));

/**
 * POST /field-agent/farmers
 * Create a new farmer
 */
router.post(
  '/farmers',
  fieldAgentController.createFarmerValidation,
  fieldAgentController.createFarmer
);

/**
 * GET /field-agent/farmers
 * List all farmers for this field agent
 */
router.get('/farmers', fieldAgentController.listFarmers);

/**
 * GET /field-agent/farmers/:farmerId/services
 * Get farmer's service records and recovery status
 */
router.get('/farmers/:farmerId/services', fieldAgentController.getFarmerRecords);

/**
 * POST /field-agent/farmers/:farmerId/services
 * Record services provided to farmer
 */
router.post(
  '/farmers/:farmerId/services',
  fieldAgentController.recordServiceValidation,
  fieldAgentController.recordService
);

/**
 * POST /field-agent/farmers/:farmerId/harvest-complete
 * DEPRECATED: Mark harvest as completed
 * This endpoint is deprecated per authoritative specification
 */
router.post(
  '/farmers/:farmerId/harvest-complete',
  fieldAgentController.markHarvestComplete
);

/**
 * POST /field-agent/farmers/:farmerId/services/:serviceId/update-date
 * NEW: Update expected recovery date when delayed
 * Requires reason (min 5 characters)
 */
router.post(
  '/farmers/:farmerId/services/:serviceId/update-date',
  fieldAgentController.updateExpectedRecoveryDateValidation,
  fieldAgentController.updateExpectedRecoveryDate
);

/**
 * GET /field-agent/expected-inventory
 * Get expected inventory projection
 */
router.get('/expected-inventory', fieldAgentController.getExpectedInventory);

/**
 * POST /field-agent/recovery-inbound
 * Record recovery inbound (linked to service record)
 */
router.post(
  '/recovery-inbound',
  fieldAgentController.recordRecoveryValidation,
  fieldAgentController.recordRecoveryInbound
);

/**
 * POST /field-agent/aggregated-inbound
 * Record aggregated inbound (independent)
 */
router.post(
  '/aggregated-inbound',
  fieldAgentController.recordAggregatedValidation,
  fieldAgentController.recordAggregatedInbound
);

export default router;
