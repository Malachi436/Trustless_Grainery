import QRCode from 'qrcode';
import logger from '../config/logger';
import { AppError } from '../middleware/errorHandler';

/**
 * QR Code Service
 * Handles QR code generation for batch tracking
 */
export class QRCodeService {
  /**
   * Generate QR code as base64 data URL
   */
  async generateQRCode(data: string | object): Promise<string> {
    try {
      const qrData = typeof data === 'string' ? data : JSON.stringify(data);
      
      const qrCodeDataURL = await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 300,
      });

      return qrCodeDataURL;
    } catch (error) {
      logger.error('Failed to generate QR code', error);
      throw new AppError('QR code generation failed', 500);
    }
  }

  /**
   * Generate QR code as buffer (for PDF generation)
   */
  async generateQRCodeBuffer(data: string | object): Promise<Buffer> {
    try {
      const qrData = typeof data === 'string' ? data : JSON.stringify(data);
      
      const buffer = await QRCode.toBuffer(qrData, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 300,
      });

      return buffer;
    } catch (error) {
      logger.error('Failed to generate QR code buffer', error);
      throw new AppError('QR code buffer generation failed', 500);
    }
  }

  /**
   * Generate batch QR code data structure
   */
  generateBatchQRData(batch: {
    id: string;
    batch_code: string;
    crop_type: string;
    source_type: string;
    initial_bags: number;
    created_at: Date;
  }): object {
    return {
      batch_id: batch.id,
      batch_code: batch.batch_code,
      crop: batch.crop_type,
      source: batch.source_type,
      bags: batch.initial_bags,
      date: batch.created_at.toISOString().split('T')[0],
      scan_url: `trustless-granary://batch/${batch.id}`,
    };
  }

  /**
   * Verify scanned QR code data
   */
  verifyBatchQRData(scannedData: string): { valid: boolean; batchId?: string; error?: string } {
    try {
      // Try parsing as JSON
      const parsed = JSON.parse(scannedData);
      
      if (!parsed.batch_id || !parsed.batch_code) {
        return {
          valid: false,
          error: 'Invalid QR code format',
        };
      }

      return {
        valid: true,
        batchId: parsed.batch_id,
      };
    } catch (error) {
      // Try parsing as URL
      if (scannedData.startsWith('trustless-granary://batch/')) {
        const batchId = scannedData.replace('trustless-granary://batch/', '');
        return {
          valid: true,
          batchId,
        };
      }

      return {
        valid: false,
        error: 'Unable to parse QR code data',
      };
    }
  }
}

export default new QRCodeService();
