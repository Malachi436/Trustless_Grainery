import eventService from './EventService';
import stockProjectionService from './StockProjectionService';
import warehouseService from './WarehouseService';
import db from '../config/database';
import logger from '../config/logger';
import { EventType, CropType } from '../types/enums';
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
 */
export class InboundService {
  /**
   * Log inbound stock (Attendant only)
   */
  async logInbound(
    warehouseId: string,
    attendantId: string,
    crop: CropType,
    bagQuantity: number,
    source: string,
    photoUrls: string[],
    localTimestamp?: string,
    notes?: string
  ): Promise<Event> {
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

    const event = await db.transaction(async (client) => {
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

      return inboundEvent;
    });

    logger.info('✅ Inbound stock logged', {
      warehouseId,
      attendantId,
      crop,
      bagQuantity,
      source,
      eventId: event.event_id,
    });

    return event;
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
