import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import logger from '../config/logger';
import { CropType, BatchSourceType } from '../types/enums';
import { Batch } from '../types/models';
import { AppError } from '../middleware/errorHandler';
import qrCodeService from './QRCodeService';

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
   * Now with automatic batch code and QR code generation
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

      // Generate batch code using database function
      const batchCodeResult = await client.query(
        'SELECT generate_batch_code($1, $2, CURRENT_DATE) as batch_code',
        [warehouseId, cropType]
      );
      const batchCode = batchCodeResult.rows[0].batch_code;

      // Get warehouse code for QR data
      const warehouseResult = await client.query(
        'SELECT warehouse_code FROM warehouses WHERE id = $1',
        [warehouseId]
      );
      const warehouseCode = warehouseResult.rows[0]?.warehouse_code;

      // Generate QR code
      const qrData = qrCodeService.generateBatchQRData({
        id: batchId,
        batch_code: batchCode,
        crop_type: cropType,
        source_type: sourceType,
        initial_bags: initialBags,
        created_at: new Date(),
      });

      const qrCodeDataURL = await qrCodeService.generateQRCode(qrData);

      const result = await client.query(
        `INSERT INTO batches (
          id, warehouse_id, crop_type, source_type, source_name, source_location,
          purchase_price_per_bag, initial_bags, remaining_bags, created_by,
          batch_code, qr_code_data, warehouse_code
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
          batchCode,
          qrCodeDataURL,
          warehouseCode,
        ]
      );

      await client.query('COMMIT');

      logger.info('✅ Batch created with QR code', {
        batchId,
        batchCode,
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
   * Now includes inbound photos from events
   */
  async getWarehouseBatches(
    warehouseId: string,
    cropType?: CropType,
    onlyAvailable: boolean = false
  ): Promise<Batch[]> {
    let query = `
      SELECT b.*, 
             e.payload->>'photo_urls' as inbound_photos
      FROM batches b
      LEFT JOIN events e ON 
        e.warehouse_id = b.warehouse_id AND 
        e.event_type = 'STOCK_INBOUND_RECORDED' AND 
        e.payload->>'crop' = b.crop_type::text AND
        DATE(e.created_at) = DATE(b.created_at) AND
        (e.payload->>'bag_quantity')::INTEGER = b.initial_bags
      WHERE b.warehouse_id = $1
    `;
    const params: any[] = [warehouseId];

    if (cropType) {
      query += ' AND b.crop_type = $2';
      params.push(cropType);
    }

    if (onlyAvailable) {
      query += ` AND b.remaining_bags > 0`;
    }

    query += ' ORDER BY b.created_at DESC';

    const result = await db.query(query, params);
    return result.rows.map(row => {
      const batch = this.mapRowToBatch(row);
      // Add inbound_photos if available
      if (row.inbound_photos) {
        try {
          (batch as any).inbound_photos = JSON.parse(row.inbound_photos);
        } catch {
          (batch as any).inbound_photos = [];
        }
      } else {
        (batch as any).inbound_photos = [];
      }
      return batch;
    });
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
   * Get a specific batch by batch code
   */
  async getBatchByCode(batchCode: string): Promise<Batch | null> {
    const result = await db.query(
      'SELECT * FROM batches WHERE batch_code = $1',
      [batchCode]
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
   * Record batch scan during dispatch execution
   */
  async recordBatchScan(
    batchId: string,
    requestId: string,
    scannedBy: string,
    bagsLoaded: number
  ): Promise<void> {
    await db.query(
      `INSERT INTO batch_scans (batch_id, request_id, scanned_by, bags_loaded)
       VALUES ($1, $2, $3, $4)`,
      [batchId, requestId, scannedBy, bagsLoaded]
    );

    logger.info('✅ Batch scan recorded', {
      batchId,
      requestId,
      scannedBy,
      bagsLoaded,
    });
  }

  /**
   * Get batch scans for a request
   */
  async getRequestBatchScans(requestId: string): Promise<any[]> {
    const result = await db.query(
      `SELECT bs.*, b.batch_code, b.crop_type, u.name as scanned_by_name
       FROM batch_scans bs
       JOIN batches b ON bs.batch_id = b.id
       JOIN users u ON bs.scanned_by = u.id
       WHERE bs.request_id = $1
       ORDER BY bs.scanned_at`,
      [requestId]
    );

    return result.rows;
  }

  /**
   * Verify batch scan (check if batch is valid for dispatch)
   */
  async verifyBatchForDispatch(
    batchId: string,
    requestId: string,
    requiredBags: number
  ): Promise<{ valid: boolean; error?: string }> {
    // Get batch details
    const batch = await this.getBatchById(batchId);

    if (!batch) {
      return {
        valid: false,
        error: 'Batch not found',
      };
    }

    // Check if batch has enough bags
    if (batch.remaining_bags < requiredBags) {
      return {
        valid: false,
        error: `Insufficient bags. Batch has ${batch.remaining_bags}, need ${requiredBags}`,
      };
    }

    // Check if batch is allocated to this request
    const allocations = await this.getRequestBatchAllocations(requestId);
    
    // If no allocations exist (FIFO mode), allow any batch from same warehouse/crop
    if (allocations.length === 0) {
      // Get request details to verify warehouse and crop match
      const requestResult = await db.query(
        'SELECT warehouse_id, crop FROM request_projections WHERE request_id = $1',
        [requestId]
      );
      
      if (requestResult.rows.length === 0) {
        return {
          valid: false,
          error: 'Request not found',
        };
      }
      
      const request = requestResult.rows[0];
      
      if (batch.warehouse_id !== request.warehouse_id) {
        return {
          valid: false,
          error: 'Batch belongs to different warehouse',
        };
      }
      
      if (batch.crop_type !== request.crop) {
        return {
          valid: false,
          error: `Batch is ${batch.crop_type}, but request is for ${request.crop}`,
        };
      }
      
      // In FIFO mode, any batch with enough bags is valid
      return { valid: true };
    }
    
    // If allocations exist, verify this specific batch is allocated
    const allocation = allocations.find(a => a.batch_id === batchId);

    if (!allocation) {
      return {
        valid: false,
        error: 'Batch not allocated to this dispatch request',
      };
    }

    if (allocation.bags_allocated !== requiredBags) {
      return {
        valid: false,
        error: `Allocation mismatch. Allocated ${allocation.bags_allocated}, scanning ${requiredBags}`,
      };
    }

    return { valid: true };
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
      batch_code: row.batch_code,
      qr_code_data: row.qr_code_data,
      warehouse_code: row.warehouse_code,
    };
  }
}

export default new BatchService();
