import db from '../config/database';
import logger from '../config/logger';
import eventService from './EventService';
import { EventType, FieldAgentStatus, FarmerStatus, RecoveryStatus, ServiceType } from '../types/enums';
import { ServiceRecordedPayload, ExpectedRecoveryDateUpdatedPayload } from '../types/models';
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
   * Now supports communities array instead of single community
   */
  async createFieldAgent(
    name: string,
    phone: string,
    communities: string[], // Changed to array
    supervisedSmes: string[] | undefined,
    createdBy: string
  ): Promise<any> {
    try {
      const fieldAgentId = uuidv4();
      
      const result = await db.query(
        `INSERT INTO field_agents (id, name, phone, communities, supervised_smes, created_by, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [fieldAgentId, name, phone, communities, supervisedSmes || [], createdBy, FieldAgentStatus.ACTIVE]
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
   * Now includes expected_recovery_date and notes
   */
  async recordService(
    farmerId: string,
    fieldAgentId: string,
    warehouseId: string,
    serviceTypes: ServiceType[],
    expectedBags: number,
    expectedRecoveryDate: string | undefined, // NEW: ISO date string
    landServices?: Array<{ service_type: ServiceType; date: string; notes?: string }>,
    landSizeAcres?: number,
    fertilizerType?: string,
    fertilizerQuantityKg?: number,
    pesticideType?: string,
    pesticideQuantityLiters?: number,
    createdBy?: string,
    notes?: string // NEW: Notes for OTHER service type
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
          pesticide_quantity_liters, expected_bags, expected_recovery_date, original_expected_date, recovery_status, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP)`,
        [
          serviceRecordId, farmerId, fieldAgentId, warehouseId,
          serviceTypes, landServices ? JSON.stringify(landServices) : null,
          landSizeAcres || null,
          fertilizerType || null, fertilizerQuantityKg || null,
          pesticideType || null, pesticideQuantityLiters || null,
          expectedBags,
          expectedRecoveryDate ? new Date(expectedRecoveryDate) : null,
          expectedRecoveryDate ? new Date(expectedRecoveryDate) : null, // Save original
          RecoveryStatus.PENDING,
          notes || null
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
        expected_recovery_date: expectedRecoveryDate,
        notes: notes,
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
   * Record services with per-service structured data
   * NEW: Accepts array of service objects, each with its own fields
   */
  async recordServiceStructured(
    farmerId: string,
    fieldAgentId: string,
    warehouseId: string,
    services: Array<{
      service_type: ServiceType;
      land_size_acres?: number;
      fertilizer_type?: string;
      fertilizer_quantity_kg?: number;
      pesticide_type?: string;
      pesticide_quantity_liters?: number;
      notes?: string;
    }>,
    expectedBags: number,
    expectedRecoveryDate: string | undefined,
    maizeColor?: string, // NEW: Maize color (RED or WHITE)
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

      // Create service record with structured services
      const serviceRecordId = uuidv4();
      
      await client.query(
        `INSERT INTO service_records 
         (id, farmer_id, field_agent_id, warehouse_id, service_types, services_data,
          expected_bags, expected_recovery_date, original_expected_date, maize_color, recovery_status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)`,
        [
          serviceRecordId, farmerId, fieldAgentId, warehouseId,
          services.map(s => s.service_type), // Legacy array for backward compatibility
          JSON.stringify(services), // NEW: Structured service data
          expectedBags,
          expectedRecoveryDate ? new Date(expectedRecoveryDate) : null,
          expectedRecoveryDate ? new Date(expectedRecoveryDate) : null, // Save original
          maizeColor || null, // NEW: Maize color
          RecoveryStatus.PENDING,
        ]
      );

      // Create recovery tracking record
      const recoveryTrackingId = uuidv4();
      await client.query(
        `INSERT INTO recovery_tracking (id, service_record_id, farmer_id, warehouse_id, expected_bags, recovery_status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [recoveryTrackingId, serviceRecordId, farmerId, warehouseId, expectedBags, RecoveryStatus.PENDING]
      );

      // Create SERVICE_RECORDED event with new structure
      const servicePayload: ServiceRecordedPayload = {
        service_record_id: serviceRecordId,
        farmer_id: farmerId,
        field_agent_id: fieldAgentId,
        services: services, // NEW: Structured services
        service_types: services.map(s => s.service_type), // Legacy field
        expected_bags: expectedBags,
        expected_recovery_date: expectedRecoveryDate,
      };

      const event = await eventService.createEvent(
        warehouseId,
        EventType.SERVICE_RECORDED,
        createdBy || fieldAgentId,
        servicePayload,
        client
      );

      await client.query('COMMIT');

      logger.info(`Structured service recorded for farmer ${farmerId}: ${serviceRecordId}`);
      return { serviceRecordId, recoveryTrackingId, eventId: event.event_id };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * DEPRECATED: Mark harvest as completed (Field Agent)
   * This method is deprecated per the authoritative specification.
   * The system no longer uses a "mark harvest complete" action.
   * Instead, Field Agents update expected recovery dates when delays occur.
   * 
   * @deprecated Use updateExpectedRecoveryDate instead
   */
  async markHarvestComplete(
    _serviceRecordId: string,
    _farmerId: string,
    _fieldAgentId: string,
    _warehouseId: string,
    _notes?: string
  ): Promise<any> {
    logger.warn('DEPRECATED: markHarvestComplete called - this method should not be used');
    throw new AppError(
      'This operation is no longer supported. Use expected recovery date updates instead.',
      400
    );
  }

  /**
   * NEW: Update expected recovery date when delayed
   * Creates EXPECTED_RECOVERY_DATE_UPDATED event
   * Field Agent must provide a reason for the date change
   */
  async updateExpectedRecoveryDate(
    serviceRecordId: string,
    farmerId: string,
    fieldAgentId: string,
    warehouseId: string,
    newDate: string, // ISO date string
    reason: string
  ): Promise<any> {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // Verify service record exists and belongs to farmer
      const recordCheck = await client.query(
        `SELECT id, expected_recovery_date, date_update_history FROM service_records 
         WHERE id = $1 AND farmer_id = $2 AND field_agent_id = $3 AND warehouse_id = $4`,
        [serviceRecordId, farmerId, fieldAgentId, warehouseId]
      );
      if (recordCheck.rows.length === 0) {
        throw new AppError('Service record not found', 404);
      }

      const currentRecord = recordCheck.rows[0];
      const oldDate = currentRecord.expected_recovery_date;

      if (!oldDate) {
        throw new AppError('No expected recovery date set for this service record', 400);
      }

      if (!reason || reason.trim().length < 5) {
        throw new AppError('Reason for date change must be provided (min 5 characters)', 400);
      }

      // Update date_update_history
      const updateHistory = currentRecord.date_update_history || [];
      updateHistory.push({
        updated_at: new Date().toISOString(),
        old_date: oldDate,
        new_date: newDate,
        reason: reason,
        updated_by: fieldAgentId
      });

      // Update service record
      await client.query(
        `UPDATE service_records 
         SET expected_recovery_date = $1, date_update_history = $2
         WHERE id = $3`,
        [new Date(newDate), JSON.stringify(updateHistory), serviceRecordId]
      );

      // Insert into recovery_date_updates table for audit
      await client.query(
        `INSERT INTO recovery_date_updates 
         (service_record_id, farmer_id, field_agent_id, warehouse_id, old_date, new_date, reason, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [serviceRecordId, farmerId, fieldAgentId, warehouseId, oldDate, new Date(newDate), reason, fieldAgentId]
      );

      // Create EXPECTED_RECOVERY_DATE_UPDATED event
      const updatePayload: ExpectedRecoveryDateUpdatedPayload = {
        service_record_id: serviceRecordId,
        farmer_id: farmerId,
        field_agent_id: fieldAgentId,
        old_date: oldDate,
        new_date: newDate,
        reason: reason,
        updated_by: fieldAgentId,
      };

      const event = await eventService.createEvent(
        warehouseId,
        EventType.EXPECTED_RECOVERY_DATE_UPDATED,
        fieldAgentId,
        updatePayload,
        client
      );

      await client.query('COMMIT');

      logger.info(`Expected recovery date updated for service record ${serviceRecordId}: ${oldDate} -> ${newDate}`);
      return { eventId: event.event_id, oldDate, newDate, reason };
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
