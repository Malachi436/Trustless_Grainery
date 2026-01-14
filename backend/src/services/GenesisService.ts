import eventService from './EventService';
import warehouseService from './WarehouseService';
import stockProjectionService from './StockProjectionService';
import batchService from './BatchService';
import db from '../config/database';
import logger from '../config/logger';
import { EventType, CropType, WarehouseStatus, BatchSourceType } from '../types/enums';
import { GenesisInventoryPayload, Event } from '../types/models';
import { AppError } from '../middleware/errorHandler';

/**
 * GenesisService
 * Handles the one-time Genesis Inventory setup
 * CRITICAL RULES:
 * - One Genesis event per crop per warehouse
 * - Admin only
 * - Requires photo evidence
 * - Requires owner confirmation
 * - Changes warehouse status to GENESIS_PENDING -> ACTIVE
 * - Optionally creates initial batches (v2 feature)
 */
export class GenesisService {
  /**
   * Record Genesis Inventory (Admin only)
   * This is the FIRST event in a warehouse's lifecycle
   * ALWAYS creates initial batches with QR codes for dispatch compatibility
   */
  async recordGenesis(
    warehouseId: string,
    adminId: string,
    crop: CropType,
    bagQuantity: number,
    photoUrls: string[],
    notes?: string,
    // v2 batch parameters (optional)
    batchSourceType?: BatchSourceType,
    sourceName?: string,
    sourceLocation?: string
  ): Promise<{ event: Event; batchId?: string }> {
    // Photo evidence is optional (can be empty array)
    // Check warehouse exists and is in SETUP status
    const warehouse = await warehouseService.getWarehouseById(warehouseId);
    if (!warehouse) {
      throw new AppError('Warehouse not found', 404);
    }

    if (warehouse.status !== WarehouseStatus.SETUP && 
        warehouse.status !== WarehouseStatus.GENESIS_PENDING) {
      throw new AppError('Genesis can only be performed on warehouses in SETUP or GENESIS_PENDING status', 400);
    }

    // Check if Genesis already exists for this crop
    const existingGenesis = await this.hasGenesisForCrop(warehouseId, crop);
    if (existingGenesis) {
      throw new AppError(`Genesis already recorded for ${crop} in this warehouse`, 400);
    }

    // Create Genesis event
    const payload: GenesisInventoryPayload = {
      crop,
      bag_quantity: bagQuantity,
      photo_urls: photoUrls,
      notes,
    };

    const result = await db.transaction(async (client) => {
      // Create event
      const genesisEvent = await eventService.createEvent(
        warehouseId,
        EventType.GENESIS_INVENTORY_RECORDED,
        adminId,
        payload,
        client
      );

      // DO NOT update stock projection yet - wait for owner confirmation
      // Stock should only appear after confirmGenesis() is called

      // Update warehouse status to GENESIS_PENDING
      if (warehouse.status === WarehouseStatus.SETUP) {
        await client.query(
          'UPDATE warehouses SET status = $1 WHERE id = $2',
          [WarehouseStatus.GENESIS_PENDING, warehouseId]
        );
      }

      let batchId: string | undefined;

      // ALWAYS create initial batch with QR code for genesis inventory
      // This ensures dispatch can work with QR verification
      const batch = await batchService.createBatch(
        warehouseId,
        crop,
        bagQuantity,
        adminId,
        batchSourceType || BatchSourceType.OWN_FARM,
        sourceName || 'Genesis Inventory',
        sourceLocation || 'Initial Stock'
      );
      batchId = batch.id;
      
      logger.info('✅ Genesis batch created with QR code', {
        batchId,
        batchCode: batch.batch_code,
        crop,
        bagQuantity,
        sourceType: batchSourceType || BatchSourceType.OWN_FARM,
      });

      return { event: genesisEvent, batchId };
    });

    logger.info('✅ Genesis inventory recorded with batch', {
      warehouseId,
      crop,
      bagQuantity,
      eventId: result.event.event_id,
      batchId: result.batchId,
      batchCreated: true,
    });

    return result;
  }

  /**
   * Confirm Genesis (Owner only)
   * Owner must confirm the Genesis inventory before warehouse becomes ACTIVE
   */
  async confirmGenesis(
    warehouseId: string,
    ownerId: string
  ): Promise<void> {
    const warehouse = await warehouseService.getWarehouseById(warehouseId);
    
    if (!warehouse) {
      throw new AppError('Warehouse not found', 404);
    }

    if (warehouse.owner_id !== ownerId) {
      throw new AppError('Only the warehouse owner can confirm Genesis', 403);
    }

    if (warehouse.status !== WarehouseStatus.GENESIS_PENDING) {
      throw new AppError('Warehouse is not in GENESIS_PENDING status', 400);
    }

    // Check if there are any Genesis events
    const genesisEvents = await this.getGenesisEvents(warehouseId);
    if (genesisEvents.length === 0) {
      throw new AppError('No Genesis inventory recorded yet', 400);
    }

    // Use transaction to ensure atomicity
    await db.transaction(async (client) => {
      // Update all Genesis events with owner confirmation
      await client.query(
        `UPDATE events 
         SET payload = payload || jsonb_build_object('confirmed_by_owner', $1::text)
         WHERE warehouse_id = $2 
         AND event_type = $3`,
        [ownerId, warehouseId, EventType.GENESIS_INVENTORY_RECORDED]
      );

      // NOW update stock projections - stock should appear only after owner confirms
      for (const genesisEvent of genesisEvents) {
        await stockProjectionService.updateProjection(warehouseId, genesisEvent, client);
        
        // Ensure batch exists for this genesis event
        // If batch wasn't created during genesis recording, create it now
        const payload = genesisEvent.payload as GenesisInventoryPayload;
        const existingBatch = await client.query(
          `SELECT id FROM batches 
           WHERE warehouse_id = $1 
           AND crop_type = $2 
           AND initial_bags = $3
           AND created_at::date = $4::date
           LIMIT 1`,
          [warehouseId, payload.crop, payload.bag_quantity, genesisEvent.created_at]
        );
        
        if (existingBatch.rows.length === 0) {
          // No batch exists, create one now
          const batch = await batchService.createBatch(
            warehouseId,
            payload.crop,
            payload.bag_quantity,
            genesisEvent.actor_id,
            BatchSourceType.OWN_FARM,
            'Genesis Inventory',
            'Initial Stock'
          );
          
          logger.info('✅ Retroactive genesis batch created during confirmation', {
            batchId: batch.id,
            batchCode: batch.batch_code,
            crop: payload.crop,
            quantity: payload.bag_quantity,
          });
        }
      }

      // Activate warehouse
      await client.query(
        'UPDATE warehouses SET status = $1 WHERE id = $2',
        [WarehouseStatus.ACTIVE, warehouseId]
      );
    });

    logger.info('✅ Genesis confirmed by owner', { warehouseId, ownerId });
  }

  /**
   * Check if Genesis exists for a crop
   */
  async hasGenesisForCrop(warehouseId: string, crop: CropType): Promise<boolean> {
    const result = await db.query(
      `SELECT event_id FROM events
       WHERE warehouse_id = $1
       AND event_type = $2
       AND payload->>'crop' = $3
       LIMIT 1`,
      [warehouseId, EventType.GENESIS_INVENTORY_RECORDED, crop]
    );

    return result.rows.length > 0;
  }

  /**
   * Get all Genesis events for a warehouse
   */
  async getGenesisEvents(warehouseId: string): Promise<Event[]> {
    return eventService.getEventsByWarehouse(warehouseId, {
      eventTypes: [EventType.GENESIS_INVENTORY_RECORDED],
    });
  }

  /**
   * Get Genesis status for warehouse
   */
  async getGenesisStatus(warehouseId: string): Promise<{
    hasGenesis: boolean;
    confirmed: boolean;
    crops: Array<{ crop: CropType; quantity: number; confirmed: boolean }>;
  }> {
    const genesisEvents = await this.getGenesisEvents(warehouseId);

    const crops = genesisEvents.map((event) => {
      const payload = event.payload as GenesisInventoryPayload;
      return {
        crop: payload.crop,
        quantity: payload.bag_quantity,
        confirmed: !!payload.confirmed_by_owner,
      };
    });

    return {
      hasGenesis: genesisEvents.length > 0,
      confirmed: crops.every((c) => c.confirmed),
      crops,
    };
  }
}

export default new GenesisService();
