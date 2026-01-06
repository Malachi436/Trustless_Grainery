import db from '../config/database';
import logger from '../config/logger';
import eventService from './EventService';
import batchService from './BatchService';
import { EventType, RecoveryStatus, BatchSourceType, CropType } from '../types/enums';
import { RecoveryInboundRecordedPayload, AggregatedInboundRecordedPayload } from '../types/models';
import { AppError } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';

/**
 * OutgrowerService
 * 
 * Manages recovery and aggregated inbound workflows
 * All operations create immutable events
 * 
 * RULES:
 * - Recovery: links to service record, updates recovery status
 * - Aggregated: independent, no service record dependency
 * - Each inbound creates a Batch with outgrower metadata
 * - No double counting - stock created ONLY on inbound event
 */
export class OutgrowerService {
  /**
   * Record recovery inbound (Attendant executing RECOVERY_INBOUND_RECORDED)
   * Links to specific service record
   */
  async recordRecoveryInbound(
    serviceRecordId: string,
    farmerId: string,
    fieldAgentId: string,
    warehouseId: string,
    cropType: CropType,
    bagsReceived: number,
    createdBy: string,
    notes?: string
  ): Promise<any> {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // Verify service record exists and get expected bags
      const recordCheck = await client.query(
        `SELECT sr.expected_bags, sr.recovery_status, rt.received_bags
         FROM service_records sr
         LEFT JOIN recovery_tracking rt ON sr.id = rt.service_record_id
         WHERE sr.id = $1 AND sr.farmer_id = $2 AND sr.field_agent_id = $3 AND sr.warehouse_id = $4`,
        [serviceRecordId, farmerId, fieldAgentId, warehouseId]
      );
      if (recordCheck.rows.length === 0) {
        throw new AppError('Service record not found', 404);
      }

      const { expected_bags, received_bags: currentReceived } = recordCheck.rows[0];
      const totalReceived = (currentReceived || 0) + bagsReceived;

      // Determine recovery status
      let recoveryStatus = RecoveryStatus.PARTIAL;
      if (totalReceived >= expected_bags) {
        recoveryStatus = RecoveryStatus.COMPLETED;
      }

      // Create Batch for this recovery inbound
      const batch = await batchService.createBatch(
        warehouseId,
        cropType,
        bagsReceived,
        createdBy,
        BatchSourceType.OUTGROWER,
        `Recovery from ${farmerId}`,
        undefined,
        undefined // No purchase price for recovery
      );

      // Update recovery tracking
      const recoveryTrackingId = uuidv4();
      await client.query(
        `UPDATE recovery_tracking 
         SET received_bags = received_bags + $1, 
             recovery_status = $2,
             batch_id = $3,
             updated_at = CURRENT_TIMESTAMP,
             completed_at = CASE WHEN $2 = $4 THEN CURRENT_TIMESTAMP ELSE completed_at END
         WHERE service_record_id = $5`,
        [bagsReceived, recoveryStatus, batch.id, RecoveryStatus.COMPLETED, serviceRecordId]
      );

      // Update service record status if needed
      await client.query(
        `UPDATE service_records 
         SET recovery_status = $1
         WHERE id = $2`,
        [recoveryStatus, serviceRecordId]
      );

      // Create RECOVERY_INBOUND_RECORDED event
      const recoveryPayload: RecoveryInboundRecordedPayload = {
        recovery_reference_id: serviceRecordId,
        service_record_id: serviceRecordId,
        farmer_id: farmerId,
        field_agent_id: fieldAgentId,
        crop: cropType,
        bags_received: bagsReceived,
        batch_id: batch.id,
        recovery_status: recoveryStatus,
        notes,
      };

      const event = await eventService.createEvent(
        warehouseId,
        EventType.RECOVERY_INBOUND_RECORDED,
        createdBy,
        recoveryPayload,
        client
      );

      await client.query('COMMIT');

      logger.info(`Recovery inbound recorded: ${bagsReceived} bags for service ${serviceRecordId}`);
      return { 
        eventId: event.event_id,
        batchId: batch.id,
        recoveryStatus,
        totalReceived,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Record aggregated inbound (Attendant executing AGGREGATED_INBOUND_RECORDED)
   * Independent of recovery - farmer's voluntary sale
   */
  async recordAggregatedInbound(
    farmerId: string,
    fieldAgentId: string,
    warehouseId: string,
    cropType: CropType,
    bags: number,
    createdBy: string,
    notes?: string
  ): Promise<any> {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // Verify farmer exists in warehouse
      const farmerCheck = await client.query(
        `SELECT id FROM farmers WHERE id = $1 AND field_agent_id = $2 AND warehouse_id = $3`,
        [farmerId, fieldAgentId, warehouseId]
      );
      if (farmerCheck.rows.length === 0) {
        throw new AppError('Farmer not found', 404);
      }

      // Create Batch for aggregated inbound
      const batch = await batchService.createBatch(
        warehouseId,
        cropType,
        bags,
        createdBy,
        BatchSourceType.OUTGROWER,
        `Aggregated from ${farmerId}`,
        undefined,
        undefined // No purchase price for aggregated
      );

      // Update batch with aggregated subtype
      await client.query(
        `UPDATE batches SET source_subtype = $1, farmer_id = $2, field_agent_id = $3
         WHERE id = $4`,
        ['AGGREGATED', farmerId, fieldAgentId, batch.id]
      );

      // Create AGGREGATED_INBOUND_RECORDED event
      const aggregatedPayload: AggregatedInboundRecordedPayload = {
        farmer_id: farmerId,
        field_agent_id: fieldAgentId,
        crop: cropType,
        bags,
        batch_id: batch.id,
        notes,
      };

      const event = await eventService.createEvent(
        warehouseId,
        EventType.AGGREGATED_INBOUND_RECORDED,
        createdBy,
        aggregatedPayload,
        client
      );

      await client.query('COMMIT');

      logger.info(`Aggregated inbound recorded: ${bags} bags from farmer ${farmerId}`);
      return { 
        eventId: event.event_id,
        batchId: batch.id,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get recovery progress for a farmer
   */
  async getFarmerRecoveryStatus(farmerId: string, warehouseId: string): Promise<any[]> {
    const result = await db.query(
      `SELECT sr.id as service_record_id, sr.expected_bags, rt.received_bags, 
              rt.recovery_status, sr.created_at, rt.completed_at,
              COALESCE(rt.received_bags, 0) - sr.expected_bags as outstanding_bags
       FROM service_records sr
       LEFT JOIN recovery_tracking rt ON sr.id = rt.service_record_id
       WHERE sr.farmer_id = $1 AND sr.warehouse_id = $2
       ORDER BY sr.created_at DESC`,
      [farmerId, warehouseId]
    );

    return result.rows;
  }

  /**
   * Get recovery summary for warehouse
   */
  async getRecoverySummary(warehouseId: string): Promise<any> {
    const result = await db.query(
      `SELECT 
         COUNT(DISTINCT rt.service_record_id) as total_recovery_records,
         SUM(rt.expected_bags) as total_expected,
         SUM(rt.received_bags) as total_received,
         COUNT(CASE WHEN rt.recovery_status = $1 THEN 1 END) as completed_count,
         COUNT(CASE WHEN rt.recovery_status = $2 THEN 1 END) as partial_count,
         COUNT(CASE WHEN rt.recovery_status = $3 THEN 1 END) as pending_count,
         COUNT(CASE WHEN rt.recovery_status = $4 THEN 1 END) as harvested_count
       FROM recovery_tracking rt
       WHERE rt.warehouse_id = $5`,
      [RecoveryStatus.COMPLETED, RecoveryStatus.PARTIAL, RecoveryStatus.PENDING, RecoveryStatus.HARVESTED, warehouseId]
    );

    return result.rows[0];
  }

  /**
   * Get aggregated inbound volume by farmer
   */
  async getAggregatedVolume(warehouseId: string): Promise<any[]> {
    const result = await db.query(
      `SELECT f.name as farmer_name, COUNT(b.id) as inbound_count, SUM(b.initial_bags) as total_bags
       FROM batches b
       JOIN farmers f ON b.farmer_id = f.id
       WHERE b.warehouse_id = $1 AND b.source_type = $2 AND b.source_subtype = $3
       GROUP BY f.id, f.name
       ORDER BY total_bags DESC`,
      [warehouseId, BatchSourceType.OUTGROWER, 'AGGREGATED']
    );

    return result.rows;
  }
}

export default new OutgrowerService();
