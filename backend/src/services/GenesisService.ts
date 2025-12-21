import eventService from './EventService';
import warehouseService from './WarehouseService';
import stockProjectionService from './StockProjectionService';
import db from '../config/database';
import logger from '../config/logger';
import { EventType, CropType, WarehouseStatus } from '../types/enums';
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
 */
export class GenesisService {
  /**
   * Record Genesis Inventory (Admin only)
   * This is the FIRST event in a warehouse's lifecycle
   */
  async recordGenesis(
    warehouseId: string,
    adminId: string,
    crop: CropType,
    bagQuantity: number,
    photoUrls: string[],
    notes?: string
  ): Promise<Event> {
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

    const event = await db.transaction(async (client) => {
      // Create event
      const genesisEvent = await eventService.createEvent(
        warehouseId,
        EventType.GENESIS_INVENTORY_RECORDED,
        adminId,
        payload,
        client
      );

      // Update stock projection
      await stockProjectionService.updateProjection(warehouseId, genesisEvent, client);

      // Update warehouse status to GENESIS_PENDING
      if (warehouse.status === WarehouseStatus.SETUP) {
        await client.query(
          'UPDATE warehouses SET status = $1 WHERE id = $2',
          [WarehouseStatus.GENESIS_PENDING, warehouseId]
        );
      }

      return genesisEvent;
    });

    logger.info('✅ Genesis inventory recorded', {
      warehouseId,
      crop,
      bagQuantity,
      eventId: event.event_id,
    });

    return event;
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

    // Update all Genesis events with owner confirmation
    await db.query(
      `UPDATE events 
       SET payload = payload || jsonb_build_object('confirmed_by_owner', $1::text)
       WHERE warehouse_id = $2 
       AND event_type = $3`,
      [ownerId, warehouseId, EventType.GENESIS_INVENTORY_RECORDED]
    );

    // Activate warehouse
    await warehouseService.updateStatus(warehouseId, WarehouseStatus.ACTIVE);

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
