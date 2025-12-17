import { PoolClient } from 'pg';
import db from '../config/database';
import logger from '../config/logger';
import eventService from './EventService';
import { StockProjection, Event, GenesisInventoryPayload, StockInboundPayload, DispatchExecutedPayload } from '../types/models';
import { EventType, CropType } from '../types/enums';

/**
 * StockProjectionService
 * Implements THE SACRED FORMULA:
 * CurrentBags = SUM(GENESIS) + SUM(INBOUND) - SUM(DISPATCH_EXECUTED)
 * 
 * CRITICAL RULES:
 * - Pending/approved requests DO NOT reduce stock
 * - Only DISPATCH_EXECUTED reduces stock
 * - Projections are rebuildable from events
 * - Events are ALWAYS the source of truth
 */
export class StockProjectionService {
  /**
   * Rebuild stock projections from scratch for a warehouse
   * This proves events are the source of truth
   */
  async rebuildProjections(warehouseId: string, client?: PoolClient): Promise<void> {
    const executor = client || db;

    // Get all relevant events
    const events = await eventService.getEventsByWarehouse(warehouseId, {
      eventTypes: [
        EventType.GENESIS_INVENTORY_RECORDED,
        EventType.STOCK_INBOUND_RECORDED,
        EventType.DISPATCH_EXECUTED,
      ],
    });

    // Group by crop and calculate
    const stockByCrop = new Map<CropType, number>();

    for (const event of events) {
      switch (event.event_type) {
        case EventType.GENESIS_INVENTORY_RECORDED: {
          const payload = event.payload as GenesisInventoryPayload;
          const current = stockByCrop.get(payload.crop) || 0;
          stockByCrop.set(payload.crop, current + payload.bag_quantity);
          break;
        }

        case EventType.STOCK_INBOUND_RECORDED: {
          const payload = event.payload as StockInboundPayload;
          const current = stockByCrop.get(payload.crop) || 0;
          stockByCrop.set(payload.crop, current + payload.bag_quantity);
          break;
        }

        case EventType.DISPATCH_EXECUTED: {
          const payload = event.payload as DispatchExecutedPayload;
          // Find the original request to get crop and quantity
          const requestEvent = await eventService.getEventsByWarehouse(warehouseId, {
            eventTypes: [EventType.OUTBOUND_REQUESTED],
          });
          const request = requestEvent.find(
            (e) => (e.payload as { request_id?: string }).request_id === payload.request_id
          );
          if (request) {
            const reqPayload = request.payload as { crop: CropType; bag_quantity: number };
            const current = stockByCrop.get(reqPayload.crop) || 0;
            stockByCrop.set(reqPayload.crop, current - reqPayload.bag_quantity);
          }
          break;
        }
      }
    }

    // Delete old projections
    await executor.query('DELETE FROM stock_projections WHERE warehouse_id = $1', [
      warehouseId,
    ]);

    // Insert new projections
    for (const [crop, bagCount] of stockByCrop.entries()) {
      const latestSeq = await eventService.getLatestSequence(warehouseId);
      await executor.query(
        `INSERT INTO stock_projections (warehouse_id, crop, bag_count, last_event_sequence)
         VALUES ($1, $2, $3, $4)`,
        [warehouseId, crop, Math.max(0, bagCount), latestSeq]
      );
    }

    logger.info('✅ Stock projections rebuilt', { warehouseId, crops: stockByCrop.size });
  }

  /**
   * Update stock projection incrementally after an event
   */
  async updateProjection(
    warehouseId: string,
    event: Event,
    client?: PoolClient
  ): Promise<void> {
    const executor = client || db;

    let crop: CropType | null = null;
    let delta = 0;

    switch (event.event_type) {
      case EventType.GENESIS_INVENTORY_RECORDED: {
        const payload = event.payload as GenesisInventoryPayload;
        crop = payload.crop;
        delta = payload.bag_quantity;
        break;
      }

      case EventType.STOCK_INBOUND_RECORDED: {
        const payload = event.payload as StockInboundPayload;
        crop = payload.crop;
        delta = payload.bag_quantity;
        break;
      }

      case EventType.DISPATCH_EXECUTED: {
        const payload = event.payload as DispatchExecutedPayload;
        // Get request to find crop
        const requestEvents = await eventService.getEventsByWarehouse(warehouseId, {
          eventTypes: [EventType.OUTBOUND_REQUESTED],
        });
        const request = requestEvents.find(
          (e) => (e.payload as { request_id?: string }).request_id === payload.request_id
        );
        if (request) {
          const reqPayload = request.payload as { crop: CropType; bag_quantity: number };
          crop = reqPayload.crop;
          delta = -reqPayload.bag_quantity;
        }
        break;
      }

      default:
        // Other events don't affect stock
        return;
    }

    if (!crop) return;

    // Upsert stock projection
    await executor.query(
      `INSERT INTO stock_projections (warehouse_id, crop, bag_count, last_event_sequence)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (warehouse_id, crop)
       DO UPDATE SET 
         bag_count = GREATEST(0, stock_projections.bag_count + $3),
         last_event_sequence = $4,
         last_updated_at = CURRENT_TIMESTAMP`,
      [warehouseId, crop, delta, event.sequence_number]
    );

    logger.info('✅ Stock projection updated', {
      warehouseId,
      crop,
      delta,
      eventType: event.event_type,
    });
  }

  /**
   * Get current stock for warehouse
   */
  async getCurrentStock(warehouseId: string): Promise<StockProjection[]> {
    const result = await db.query(
      'SELECT * FROM stock_projections WHERE warehouse_id = $1 ORDER BY crop',
      [warehouseId]
    );

    return result.rows.map(this.mapRowToProjection);
  }

  /**
   * Get stock for specific crop
   */
  async getStockByCrop(warehouseId: string, crop: CropType): Promise<number> {
    const result = await db.query(
      'SELECT bag_count FROM stock_projections WHERE warehouse_id = $1 AND crop = $2',
      [warehouseId, crop]
    );

    return result.rows[0]?.bag_count || 0;
  }

  /**
   * Check if sufficient stock exists for a request
   */
  async hasSufficientStock(
    warehouseId: string,
    crop: CropType,
    quantity: number
  ): Promise<boolean> {
    const currentStock = await this.getStockByCrop(warehouseId, crop);
    return currentStock >= quantity;
  }

  /**
   * Map database row to StockProjection
   */
  private mapRowToProjection(row: unknown): StockProjection {
    const r = row as Record<string, unknown>;
    return {
      warehouse_id: r.warehouse_id as string,
      crop: r.crop as CropType,
      bag_count: Number(r.bag_count),
      last_updated_at: new Date(r.last_updated_at as string),
      last_event_sequence: Number(r.last_event_sequence),
    };
  }
}

export default new StockProjectionService();
