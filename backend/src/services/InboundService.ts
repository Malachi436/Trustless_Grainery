import eventService from './EventService';
import stockProjectionService from './StockProjectionService';
import warehouseService from './WarehouseService';
import batchService from './BatchService';
import db from '../config/database';
import logger from '../config/logger';
import { EventType, CropType, BatchSourceType } from '../types/enums';
import { StockInboundPayload, Event } from '../types/models';
import { AppError } from '../middleware/errorHandler';

/**
 * InboundService
 * Handles stock inbound logging
 * RULES:
 * - Attendant only
 * - Requires photo evidence
 * - Works offline-first (local_timestamp preserved)
 * - Server timestamp is authoritative
 * - Immediately updates stock projection
 * - Optionally creates batch for batch-aware tracking (v2 feature)
 */
export class InboundService {
  /**
   * Log inbound stock (Attendant only)
   * Extended to optionally create batch
   */
  async logInbound(
    warehouseId: string,
    attendantId: string,
    crop: CropType,
    bagQuantity: number,
    source: string,
    photoUrls: string[],
    localTimestamp?: string,
    notes?: string,
    // v2 batch parameters (optional)
    createBatch?: boolean,
    batchSourceType?: BatchSourceType,
    sourceName?: string,
    sourceLocation?: string,
    purchasePricePerBag?: number
  ): Promise<{ event: Event; batchId?: string }> {
    // Validate photo evidence
    if (!photoUrls || photoUrls.length === 0) {
      throw new AppError('Photo evidence is mandatory for inbound stock', 400);
    }

    // Validate quantity
    if (bagQuantity <= 0) {
      throw new AppError('Bag quantity must be greater than 0', 400);
    }

    // Validate source
    if (!source || source.trim().length === 0) {
      throw new AppError('Source location is required', 400);
    }

    // Check warehouse is active
    const isActive = await warehouseService.isActive(warehouseId);
    if (!isActive) {
      throw new AppError('Warehouse is not active. Contact administrator.', 400);
    }

    // Create inbound event
    const payload: StockInboundPayload = {
      crop,
      bag_quantity: bagQuantity,
      source: source.trim(),
      photo_urls: photoUrls,
      local_timestamp: localTimestamp,
      notes,
    };

    const result = await db.transaction(async (client) => {
      // Create event
      const inboundEvent = await eventService.createEvent(
        warehouseId,
        EventType.STOCK_INBOUND_RECORDED,
        attendantId,
        payload,
        client
      );

      // Update stock projection
      await stockProjectionService.updateProjection(warehouseId, inboundEvent, client);

      let batchId: string | undefined;

      // v2: Optionally create batch
      if (createBatch) {
        const batch = await batchService.createBatch(
          warehouseId,
          crop,
          bagQuantity,
          attendantId,
          batchSourceType || BatchSourceType.OWN_FARM,
          sourceName,
          sourceLocation || source,
          purchasePricePerBag
        );
        batchId = batch.id;
        
        logger.info('✅ Batch created during inbound', {
          batchId,
          crop,
          bagQuantity,
          sourceType: batchSourceType,
        });
      }

      return { event: inboundEvent, batchId };
    });

    logger.info('✅ Inbound stock logged', {
      warehouseId,
      attendantId,
      crop,
      bagQuantity,
      source,
      eventId: result.event.event_id,
      batchCreated: !!result.batchId,
    });

    return result;
  }

  /**
   * Get recent inbound entries
   */
  async getRecentInbounds(
    warehouseId: string,
    limit: number = 10
  ): Promise<Event[]> {
    return eventService.getEventsByWarehouse(warehouseId, {
      eventTypes: [EventType.STOCK_INBOUND_RECORDED],
      limit,
    });
  }

  /**
   * Get inbounds by crop
   */
  async getInboundsByCrop(
    warehouseId: string,
    crop: CropType,
    limit?: number
  ): Promise<Event[]> {
    const allInbounds = await eventService.getEventsByWarehouse(warehouseId, {
      eventTypes: [EventType.STOCK_INBOUND_RECORDED],
      limit,
    });

    return allInbounds.filter((event) => {
      const payload = event.payload as StockInboundPayload;
      return payload.crop === crop;
    });
  }

  /**
   * Get total inbound for a crop
   */
  async getTotalInboundForCrop(
    warehouseId: string,
    crop: CropType
  ): Promise<number> {
    const inbounds = await this.getInboundsByCrop(warehouseId, crop);
    return inbounds.reduce((total, event) => {
      const payload = event.payload as StockInboundPayload;
      return total + payload.bag_quantity;
    }, 0);
  }

  /**
   * Get inbounds by attendant
   */
  async getInboundsByAttendant(
    attendantId: string,
    limit: number = 50
  ): Promise<Event[]> {
    return eventService.getEventsByActor(attendantId, limit);
  }
}

export default new InboundService();
