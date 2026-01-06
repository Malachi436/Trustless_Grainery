import db from '../config/database';
import logger from '../config/logger';
import eventService from './EventService';
import { EventType, FieldAgentStatus, FarmerStatus, RecoveryStatus, ServiceType } from '../types/enums';
import { ServiceRecordedPayload, HarvestCompletedPayload } from '../types/models';
import { AppError } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';

/**
 * FieldAgentService
 * 
 * Manages field agents, farmers, and service records
 * All operations are logged as immutable events
 * 
 * RULES:
 * - Field agents are warehouse-scoped
 * - Farmers belong to a field agent + warehouse
 * - Service records track services, inputs, and expected yields
 * - Expected inventory is projection-only (not stock)
 * - No editing after creation - corrections are new events
 */
export class FieldAgentService {
  /**
   * Create a new field agent (Admin/Owner only)
   */
  async createFieldAgent(
    name: string,
    phone: string,
    community: string,
    createdBy: string
  ): Promise<any> {
    try {
      const fieldAgentId = uuidv4();
      
      const result = await db.query(
        `INSERT INTO field_agents (id, name, phone, community, created_by, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [fieldAgentId, name, phone, community, createdBy, FieldAgentStatus.ACTIVE]
      );

      logger.info(`Field agent created: ${fieldAgentId}`);
      return result.rows[0];
    } catch (error) {
      if (error instanceof Error && error.message.includes('duplicate key')) {
        throw new AppError('Field agent phone already exists', 400);
      }
      throw error;
    }
  }

  /**
   * Assign field agent to warehouse (Owner/Admin)
   */
  async assignToWarehouse(
    fieldAgentId: string,
    warehouseId: string,
    assignedBy: string
  ): Promise<void> {
    try {
      // Verify field agent exists
      const agentCheck = await db.query(
        'SELECT id FROM field_agents WHERE id = $1',
        [fieldAgentId]
      );
      if (agentCheck.rows.length === 0) {
        throw new AppError('Field agent not found', 404);
      }

      // Verify warehouse exists
      const warehouseCheck = await db.query(
        'SELECT id FROM warehouses WHERE id = $1',
        [warehouseId]
      );
      if (warehouseCheck.rows.length === 0) {
        throw new AppError('Warehouse not found', 404);
      }

      await db.query(
        `INSERT INTO warehouse_field_agents (warehouse_id, field_agent_id, assigned_by)
         VALUES ($1, $2, $3)
         ON CONFLICT (warehouse_id, field_agent_id) DO NOTHING`,
        [warehouseId, fieldAgentId, assignedBy]
      );

      logger.info(`Field agent ${fieldAgentId} assigned to warehouse ${warehouseId}`);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a farmer record (Field Agent only, for their assigned warehouse)
   */
  async createFarmer(
    fieldAgentId: string,
    warehouseId: string,
    name: string,
    phone?: string,
    community?: string,
    createdBy?: string
  ): Promise<any> {
    try {
      // Verify field agent is assigned to warehouse
      const assignmentCheck = await db.query(
        `SELECT id FROM warehouse_field_agents 
         WHERE field_agent_id = $1 AND warehouse_id = $2`,
        [fieldAgentId, warehouseId]
      );
      if (assignmentCheck.rows.length === 0) {
        throw new AppError('Field agent not assigned to this warehouse', 403);
      }

      const farmerId = uuidv4();
      
      const result = await db.query(
        `INSERT INTO farmers (id, field_agent_id, warehouse_id, name, phone, community, created_by, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [farmerId, fieldAgentId, warehouseId, name, phone || null, community || null, createdBy || fieldAgentId, FarmerStatus.ACTIVE]
      );

      logger.info(`Farmer created: ${farmerId} for field agent ${fieldAgentId}`);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Record services provided to a farmer
   * Creates SERVICE_RECORDED event
   */
  async recordService(
    farmerId: string,
    fieldAgentId: string,
    warehouseId: string,
    serviceTypes: ServiceType[],
    expectedBags: number,
    landServices?: Array<{ service_type: ServiceType; date: string; notes?: string }>,
    landSizeAcres?: number,
    fertilizerType?: string,
    fertilizerQuantityKg?: number,
    pesticideType?: string,
    pesticideQuantityLiters?: number,
    createdBy?: string
  ): Promise<any> {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // Verify farmer belongs to field agent + warehouse
      const farmerCheck = await client.query(
        `SELECT id FROM farmers WHERE id = $1 AND field_agent_id = $2 AND warehouse_id = $3 AND status = $4`,
        [farmerId, fieldAgentId, warehouseId, FarmerStatus.ACTIVE]
      );
      if (farmerCheck.rows.length === 0) {
        throw new AppError('Farmer not found or not assigned to this field agent', 404);
      }

      // Create service record
      const serviceRecordId = uuidv4();
      
      await client.query(
        `INSERT INTO service_records 
         (id, farmer_id, field_agent_id, warehouse_id, service_types, land_services, 
          land_size_acres, fertilizer_type, fertilizer_quantity_kg, pesticide_type, 
          pesticide_quantity_liters, expected_bags, recovery_status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP)`,
        [
          serviceRecordId, farmerId, fieldAgentId, warehouseId,
          serviceTypes, landServices ? JSON.stringify(landServices) : null,
          landSizeAcres || null,
          fertilizerType || null, fertilizerQuantityKg || null,
          pesticideType || null, pesticideQuantityLiters || null,
          expectedBags, RecoveryStatus.PENDING
        ]
      );

      // Create recovery tracking record
      const recoveryTrackingId = uuidv4();
      await client.query(
        `INSERT INTO recovery_tracking (id, service_record_id, farmer_id, warehouse_id, expected_bags, recovery_status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [recoveryTrackingId, serviceRecordId, farmerId, warehouseId, expectedBags, RecoveryStatus.PENDING]
      );

      // Create SERVICE_RECORDED event
      const servicePayload: ServiceRecordedPayload = {
        service_record_id: serviceRecordId,
        farmer_id: farmerId,
        field_agent_id: fieldAgentId,
        service_types: serviceTypes,
        land_services: landServices,
        land_size_acres: landSizeAcres,
        fertilizer_type: fertilizerType,
        fertilizer_quantity_kg: fertilizerQuantityKg,
        pesticide_type: pesticideType,
        pesticide_quantity_liters: pesticideQuantityLiters,
        expected_bags: expectedBags,
      };

      const event = await eventService.createEvent(
        warehouseId,
        EventType.SERVICE_RECORDED,
        createdBy || fieldAgentId,
        servicePayload,
        client
      );

      await client.query('COMMIT');

      logger.info(`Service recorded for farmer ${farmerId}: ${serviceRecordId}`);
      return { serviceRecordId, recoveryTrackingId, eventId: event.event_id };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Mark harvest as completed (Field Agent)
   * Creates HARVEST_COMPLETED event
   */
  async markHarvestComplete(
    serviceRecordId: string,
    farmerId: string,
    fieldAgentId: string,
    warehouseId: string,
    notes?: string
  ): Promise<any> {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // Verify service record exists and belongs to farmer
      const recordCheck = await client.query(
        `SELECT id, recovery_status FROM service_records 
         WHERE id = $1 AND farmer_id = $2 AND field_agent_id = $3 AND warehouse_id = $4`,
        [serviceRecordId, farmerId, fieldAgentId, warehouseId]
      );
      if (recordCheck.rows.length === 0) {
        throw new AppError('Service record not found', 404);
      }

      // Update service record
      await client.query(
        `UPDATE service_records SET harvest_completed_at = CURRENT_TIMESTAMP, recovery_status = $1
         WHERE id = $2`,
        [RecoveryStatus.HARVESTED, serviceRecordId]
      );

      // Update recovery tracking
      await client.query(
        `UPDATE recovery_tracking SET recovery_status = $1
         WHERE service_record_id = $2`,
        [RecoveryStatus.HARVESTED, serviceRecordId]
      );

      // Create HARVEST_COMPLETED event
      const harvestPayload: HarvestCompletedPayload = {
        service_record_id: serviceRecordId,
        farmer_id: farmerId,
        field_agent_id: fieldAgentId,
        harvest_completed_by: fieldAgentId,
        notes,
      };

      const event = await eventService.createEvent(
        warehouseId,
        EventType.HARVEST_COMPLETED,
        fieldAgentId,
        harvestPayload,
        client
      );

      await client.query('COMMIT');

      logger.info(`Harvest marked complete for service record ${serviceRecordId}`);
      return { eventId: event.event_id };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get farmer's service records and expected inventory
   */
  async getFarmerRecords(farmerId: string, warehouseId: string): Promise<any[]> {
    const result = await db.query(
      `SELECT sr.*, rt.received_bags, rt.recovery_status, rt.completed_at
       FROM service_records sr
       LEFT JOIN recovery_tracking rt ON sr.id = rt.service_record_id
       WHERE sr.farmer_id = $1 AND sr.warehouse_id = $2
       ORDER BY sr.created_at DESC`,
      [farmerId, warehouseId]
    );

    return result.rows;
  }

  /**
   * Get expected inventory projection for warehouse
   */
  async getExpectedInventory(warehouseId: string): Promise<any[]> {
    const result = await db.query(
      `SELECT * FROM expected_inventory WHERE warehouse_id = $1
       ORDER BY created_at DESC`,
      [warehouseId]
    );

    return result.rows;
  }

  /**
   * Get all farmers for field agent + warehouse
   */
  async getFarmers(fieldAgentId: string, warehouseId: string): Promise<any[]> {
    const result = await db.query(
      `SELECT f.*, COUNT(sr.id) as service_records_count
       FROM farmers f
       LEFT JOIN service_records sr ON f.id = sr.farmer_id
       WHERE f.field_agent_id = $1 AND f.warehouse_id = $2 AND f.status = $3
       GROUP BY f.id
       ORDER BY f.name ASC`,
      [fieldAgentId, warehouseId, FarmerStatus.ACTIVE]
    );

    return result.rows;
  }
}

export default new FieldAgentService();
