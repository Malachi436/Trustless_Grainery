import QRCode from 'qrcode';
import db from '../config/database';
import logger from '../config/logger';
import { AppError } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';

/**
 * QRCodeService
 * Generates and manages QR codes for batches
 * 
 * Per authoritative spec:
 * - Every batch gets a QR code
 * - Can be printed by Owners and Attendants
 * - Platform Admin has read-only vault access
 * - QR codes are identifiers only (do not grant permissions)
 */
export class QRCodeService {
  /**
   * Generate QR code for a batch
   * Creates QR code data and stores in vault
   */
  async generateBatchQRCode(
    batchId: string,
    warehouseId: string,
    generatedBy: string
  ): Promise<{ qrCodeData: string; qrCodeUrl: string }> {
    try {
      // Check if QR code already exists for this batch
      const existing = await db.query(
        'SELECT qr_code_data, qr_code_url FROM qr_code_vault WHERE batch_id = $1',
        [batchId]
      );

      if (existing.rows.length > 0) {
        logger.info(`QR code already exists for batch ${batchId}`);
        return {
          qrCodeData: existing.rows[0].qr_code_data,
          qrCodeUrl: existing.rows[0].qr_code_url,
        };
      }

      // Get batch details
      const batchResult = await db.query(
        `SELECT b.*, w.name as warehouse_name, f.name as farmer_name
         FROM batches b
         JOIN warehouses w ON b.warehouse_id = w.id
         LEFT JOIN farmers f ON b.farmer_id = f.id
         WHERE b.id = $1`,
        [batchId]
      );

      if (batchResult.rows.length === 0) {
        throw new AppError('Batch not found', 404);
      }

      const batch = batchResult.rows[0];

      // Create QR code data (JSON format)
      const qrData = JSON.stringify({
        batch_id: batchId,
        warehouse_id: warehouseId,
        warehouse_name: batch.warehouse_name,
        crop_type: batch.crop_type,
        source_type: batch.source_type,
        source_subtype: batch.source_subtype,
        initial_bags: batch.initial_bags,
        remaining_bags: batch.remaining_bags,
        created_at: batch.created_at,
        farmer_name: batch.farmer_name || null,
        qr_type: 'TRUSTLESS_GRANARY_BATCH',
      });

      // Generate QR code as Data URL
      const qrCodeUrl = await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 300,
        margin: 2,
      });

      // Store in QR vault
      const vaultId = uuidv4();
      await db.query(
        `INSERT INTO qr_code_vault (id, batch_id, qr_code_data, qr_code_url, generated_by, warehouse_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [vaultId, batchId, qrData, qrCodeUrl, generatedBy, warehouseId]
      );

      logger.info(`✅ QR code generated for batch ${batchId}`, {
        batchId,
        warehouseId,
        generatedBy,
      });

      return {
        qrCodeData: qrData,
        qrCodeUrl,
      };
    } catch (error) {
      logger.error('Failed to generate QR code', { error, batchId });
      throw error;
    }
  }

  /**
   * Get QR code for a batch
   * Returns existing QR code or generates new one
   */
  async getBatchQRCode(batchId: string, warehouseId: string, userId: string): Promise<any> {
    try {
      // Check if QR exists
      const result = await db.query(
        'SELECT * FROM qr_code_vault WHERE batch_id = $1',
        [batchId]
      );

      if (result.rows.length > 0) {
        return result.rows[0];
      }

      // Generate new QR code
      const { qrCodeData, qrCodeUrl } = await this.generateBatchQRCode(
        batchId,
        warehouseId,
        userId
      );

      return {
        batch_id: batchId,
        qr_code_data: qrCodeData,
        qr_code_url: qrCodeUrl,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all QR codes for a warehouse
   * Owner and Attendant access
   */
  async getWarehouseQRCodes(warehouseId: string): Promise<any[]> {
    const result = await db.query(
      `SELECT qr.*, b.crop_type, b.source_type, b.initial_bags, b.remaining_bags
       FROM qr_code_vault qr
       JOIN batches b ON qr.batch_id = b.id
       WHERE qr.warehouse_id = $1
       ORDER BY qr.generated_at DESC`,
      [warehouseId]
    );

    return result.rows;
  }

  /**
   * Get read-only QR vault (Platform Admin only)
   * Access to all QR codes across all warehouses
   */
  async getAdminQRVault(limit: number = 100, offset: number = 0): Promise<any> {
    const result = await db.query(
      `SELECT * FROM admin_qr_vault
       ORDER BY generated_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await db.query(
      'SELECT COUNT(*) as total FROM qr_code_vault'
    );

    return {
      qrCodes: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit,
      offset,
    };
  }

  /**
   * Bulk generate QR codes for all batches without QR codes
   * Used during migration or batch generation
   */
  async generateMissingQRCodes(warehouseId: string, generatedBy: string): Promise<number> {
    try {
      // Get batches without QR codes
      const batchesResult = await db.query(
        `SELECT b.id, b.warehouse_id
         FROM batches b
         LEFT JOIN qr_code_vault qr ON b.id = qr.batch_id
         WHERE b.warehouse_id = $1 AND qr.batch_id IS NULL`,
        [warehouseId]
      );

      const batches = batchesResult.rows;
      let generated = 0;

      for (const batch of batches) {
        try {
          await this.generateBatchQRCode(batch.id, batch.warehouse_id, generatedBy);
          generated++;
        } catch (error) {
          logger.error(`Failed to generate QR for batch ${batch.id}`, { error });
        }
      }

      logger.info(`✅ Bulk QR generation complete: ${generated}/${batches.length}`, {
        warehouseId,
        generated,
        total: batches.length,
      });

      return generated;
    } catch (error) {
      logger.error('Bulk QR generation failed', { error, warehouseId });
      throw error;
    }
  }

  /**
   * Decode QR code data
   * Parse QR code JSON to verify authenticity
   */
  decodeQRData(qrCodeData: string): any {
    try {
      const data = JSON.parse(qrCodeData);
      
      // Validate it's a Trustless Granary QR code
      if (data.qr_type !== 'TRUSTLESS_GRANARY_BATCH') {
        throw new AppError('Invalid QR code type', 400);
      }

      return data;
    } catch (error) {
      throw new AppError('Invalid QR code data', 400);
    }
  }

  /**
   * Verify batch QR code authenticity
   * Check if QR code matches database record
   */
  async verifyBatchQRCode(qrCodeData: string): Promise<boolean> {
    try {
      const decoded = this.decodeQRData(qrCodeData);
      
      // Check if batch exists and QR is registered
      const result = await db.query(
        `SELECT qr.qr_code_data
         FROM qr_code_vault qr
         WHERE qr.batch_id = $1`,
        [decoded.batch_id]
      );

      if (result.rows.length === 0) {
        return false;
      }

      // Verify data matches
      return result.rows[0].qr_code_data === qrCodeData;
    } catch (error) {
      return false;
    }
  }
}

export default new QRCodeService();
