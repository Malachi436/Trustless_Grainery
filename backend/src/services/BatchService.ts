import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import logger from '../config/logger';
import { CropType, BatchSourceType } from '../types/enums';
import { Batch } from '../types/models';
import { AppError } from '../middleware/errorHandler';

/**
 * BatchService
 * Manages inventory batches with source tracking
 * 
 * CRITICAL RULES:
 * - Batches are created during inbound or genesis
 * - remaining_bags is derived from events, not directly updated
 * - Each batch tracks purchase price and source
 */
export class BatchService {
  /**
   * Create a new batch (typically during inbound or genesis)
   */
  async createBatch(
    warehouseId: string,
    cropType: CropType,
    initialBags: number,
    createdBy: string,
    sourceType: BatchSourceType = BatchSourceType.OWN_FARM,
    sourceName?: string,
    sourceLocation?: string,
    purchasePricePerBag?: number
  ): Promise<Batch> {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      const batchId = uuidv4();

      const result = await client.query(
        `INSERT INTO batches (
          id, warehouse_id, crop_type, source_type, source_name, source_location,
          purchase_price_per_bag, initial_bags, remaining_bags, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          batchId,
          warehouseId,
          cropType,
          sourceType,
          sourceName || null,
          sourceLocation || null,
          purchasePricePerBag || null,
          initialBags,
          initialBags, // Initially, remaining = initial
          createdBy,
        ]
      );

      await client.query('COMMIT');

      logger.info('✅ Batch created', {
        batchId,
        warehouseId,
        cropType,
        initialBags,
        sourceType,
      });

      return this.mapRowToBatch(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('❌ Create batch failed', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get batches for a warehouse, optionally filtered by crop
   */
  async getWarehouseBatches(
    warehouseId: string,
    cropType?: CropType,
    onlyAvailable: boolean = false
  ): Promise<Batch[]> {
    let query = 'SELECT * FROM batches WHERE warehouse_id = $1';
    const params: any[] = [warehouseId];

    if (cropType) {
      query += ' AND crop_type = $2';
      params.push(cropType);
    }

    if (onlyAvailable) {
      query += ` AND remaining_bags > 0`;
    }

    query += ' ORDER BY created_at DESC';

    const result = await db.query(query, params);
    return result.rows.map(this.mapRowToBatch);
  }

  /**
   * Get a specific batch by ID
   */
  async getBatchById(batchId: string): Promise<Batch | null> {
    const result = await db.query(
      'SELECT * FROM batches WHERE id = $1',
      [batchId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToBatch(result.rows[0]);
  }

  /**
   * Update remaining bags for a batch (called after dispatch execution)
   * This is safe because it's derived from events
   */
  async updateRemainingBags(
    batchId: string,
    bagsToDeduct: number,
    client?: any
  ): Promise<void> {
    const useClient = client || db;

    const result = await useClient.query(
      `UPDATE batches 
       SET remaining_bags = remaining_bags - $1
       WHERE id = $2 AND remaining_bags >= $1
       RETURNING remaining_bags`,
      [bagsToDeduct, batchId]
    );

    if (result.rows.length === 0) {
      throw new AppError(
        `Insufficient bags in batch or batch not found`,
        400
      );
    }

    logger.info('✅ Batch remaining bags updated', {
      batchId,
      deducted: bagsToDeduct,
      remaining: result.rows[0].remaining_bags,
    });
  }

  /**
   * Validate batch allocation (ensure total bags match and batches exist)
   */
  async validateBatchAllocation(
    warehouseId: string,
    cropType: CropType,
    batchBreakdown: Array<{ batch_id: string; bags: number }>
  ): Promise<{ valid: boolean; error?: string }> {
    // Validate all batches exist and have enough bags
    for (const item of batchBreakdown) {
      const batch = await this.getBatchById(item.batch_id);

      if (!batch) {
        return {
          valid: false,
          error: `Batch ${item.batch_id} not found`,
        };
      }

      if (batch.warehouse_id !== warehouseId) {
        return {
          valid: false,
          error: `Batch ${item.batch_id} does not belong to this warehouse`,
        };
      }

      if (batch.crop_type !== cropType) {
        return {
          valid: false,
          error: `Batch ${item.batch_id} is for ${batch.crop_type}, not ${cropType}`,
        };
      }

      if (batch.remaining_bags < item.bags) {
        return {
          valid: false,
          error: `Batch ${item.batch_id} has only ${batch.remaining_bags} bags available, requested ${item.bags}`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Record batch allocation for a request (projection)
   */
  async recordBatchAllocation(
    requestId: string,
    batchBreakdown: Array<{ batch_id: string; bags: number }>,
    client?: any
  ): Promise<void> {
    const useClient = client || db;

    for (const item of batchBreakdown) {
      await useClient.query(
        `INSERT INTO batch_allocations (request_id, batch_id, bags_allocated)
         VALUES ($1, $2, $3)`,
        [requestId, item.batch_id, item.bags]
      );
    }

    logger.info('✅ Batch allocation recorded', {
      requestId,
      batchCount: batchBreakdown.length,
    });
  }

  /**
   * Get batch allocations for a request
   */
  async getRequestBatchAllocations(requestId: string): Promise<any[]> {
    const result = await db.query(
      `SELECT ba.*, b.crop_type, b.source_type, b.source_name
       FROM batch_allocations ba
       JOIN batches b ON ba.batch_id = b.id
       WHERE ba.request_id = $1
       ORDER BY ba.created_at`,
      [requestId]
    );

    return result.rows;
  }

  /**
   * Map database row to Batch model
   */
  private mapRowToBatch(row: any): Batch {
    return {
      id: row.id,
      warehouse_id: row.warehouse_id,
      crop_type: row.crop_type,
      source_type: row.source_type,
      source_name: row.source_name,
      source_location: row.source_location,
      purchase_price_per_bag: row.purchase_price_per_bag
        ? parseFloat(row.purchase_price_per_bag)
        : null,
      initial_bags: row.initial_bags,
      remaining_bags: row.remaining_bags,
      created_at: row.created_at,
      created_by: row.created_by,
    };
  }
}

export default new BatchService();
