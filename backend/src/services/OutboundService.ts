import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import logger from '../config/logger';
import eventService from './EventService';
import stockProjectionService from './StockProjectionService';
import { EventType, RequestStatus, CropType, UserRole } from '../types/enums';
import { 
  OutboundRequestPayload, 
  OutboundApprovedPayload, 
  OutboundRejectedPayload,
  DispatchExecutedPayload 
} from '../types/models';
import { AppError } from '../middleware/errorHandler';

/**
 * OutboundService
 * Handles the complete outbound dispatch workflow:
 * 1. Attendant requests dispatch (OUTBOUND_REQUESTED)
 * 2. Owner approves or rejects (OUTBOUND_APPROVED / OUTBOUND_REJECTED)
 * 3. Attendant executes dispatch with photo (DISPATCH_EXECUTED)
 * 
 * CRITICAL: Each step creates an IMMUTABLE event
 */
export class OutboundService {
  /**
   * Step 1: Attendant requests outbound dispatch
   * Creates OUTBOUND_REQUESTED event
   */
  async requestDispatch(
    warehouseId: string,
    attendantId: string,
    cropType: CropType,
    bags: number,
    recipientName: string,
    notes?: string
  ): Promise<{ requestId: string; eventId: string }> {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // Verify attendant has access to this warehouse
      const attendantCheck = await client.query(
        'SELECT 1 FROM attendant_warehouses WHERE attendant_id = $1 AND warehouse_id = $2',
        [attendantId, warehouseId]
      );

      if (attendantCheck.rows.length === 0) {
        throw new AppError('Attendant not assigned to this warehouse', 403);
      }

      // Check current stock
      const stock = await stockProjectionService.getCurrentStock(warehouseId);
      const currentBags = stock.find(s => s.crop === cropType)?.bag_count || 0;

      if (currentBags < bags) {
        throw new AppError(
          `Insufficient stock. Requested: ${bags}, Available: ${currentBags}`,
          400
        );
      }

      const requestId = uuidv4();

      const payload: OutboundRequestPayload = {
        request_id: requestId,
        crop_type: cropType,
        bags,
        recipient_name: recipientName,
        notes: notes || null,
      };

      // Create immutable event
      const event = await eventService.createEvent(
        warehouseId,
        EventType.OUTBOUND_REQUESTED,
        attendantId,
        payload,
        client
      );

      // Update request projection
      await client.query(
        `INSERT INTO request_projections (
          request_id, warehouse_id, crop, bag_quantity, 
          buyer_name, buyer_phone, requested_by, status, requested_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          requestId,
          warehouseId,
          cropType,
          bags,
          recipientName,
          '', // buyer_phone - we'll add this field to API later
          attendantId,
          RequestStatus.PENDING,
          event.created_at
        ]
      );

      await client.query('COMMIT');

      logger.info('✅ Dispatch requested', {
        requestId,
        warehouseId,
        cropType,
        bags,
        attendantId,
      });

      return { requestId, eventId: event.event_id };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('❌ Request dispatch failed', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Step 2a: Owner approves outbound request
   * Creates OUTBOUND_APPROVED event
   */
  async approveRequest(
    requestId: string,
    ownerId: string,
    notes?: string
  ): Promise<{ eventId: string }> {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // Get request details
      const requestResult = await client.query(
        'SELECT * FROM request_projections WHERE request_id = $1',
        [requestId]
      );

      if (requestResult.rows.length === 0) {
        throw new AppError('Request not found', 404);
      }

      const request = requestResult.rows[0];

      if (request.status !== RequestStatus.PENDING) {
        throw new AppError(`Request already ${request.status}`, 400);
      }

      // Verify owner owns this warehouse
      const ownerCheck = await client.query(
        'SELECT 1 FROM warehouses WHERE id = $1 AND owner_id = $2',
        [request.warehouse_id, ownerId]
      );

      if (ownerCheck.rows.length === 0) {
        throw new AppError('Not authorized to approve this request', 403);
      }

      const payload: OutboundApprovedPayload = {
        request_id: requestId,
        notes: notes || null,
      };

      // Create immutable event
      const event = await eventService.createEvent(
        request.warehouse_id,
        EventType.OUTBOUND_APPROVED,
        ownerId,
        payload,
        client
      );

      // Update request projection
      await client.query(
        `UPDATE request_projections 
         SET status = $1, approved_by = $2, approved_at = $3
         WHERE request_id = $4`,
        [RequestStatus.APPROVED, ownerId, event.created_at, requestId]
      );

      await client.query('COMMIT');

      logger.info('✅ Request approved', { requestId, ownerId });

      return { eventId: event.event_id };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('❌ Approve request failed', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Step 2b: Owner rejects outbound request
   * Creates OUTBOUND_REJECTED event
   */
  async rejectRequest(
    requestId: string,
    ownerId: string,
    reason: string
  ): Promise<{ eventId: string }> {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // Get request details
      const requestResult = await client.query(
        'SELECT * FROM request_projections WHERE request_id = $1',
        [requestId]
      );

      if (requestResult.rows.length === 0) {
        throw new AppError('Request not found', 404);
      }

      const request = requestResult.rows[0];

      if (request.status !== RequestStatus.PENDING) {
        throw new AppError(`Request already ${request.status}`, 400);
      }

      // Verify owner owns this warehouse
      const ownerCheck = await client.query(
        'SELECT 1 FROM warehouses WHERE id = $1 AND owner_id = $2',
        [request.warehouse_id, ownerId]
      );

      if (ownerCheck.rows.length === 0) {
        throw new AppError('Not authorized to reject this request', 403);
      }

      const payload: OutboundRejectedPayload = {
        request_id: requestId,
        reason,
      };

      // Create immutable event
      const event = await eventService.createEvent(
        request.warehouse_id,
        EventType.OUTBOUND_REJECTED,
        ownerId,
        payload,
        client
      );

      // Update request projection
      await client.query(
        `UPDATE request_projections 
         SET status = $1, rejected_by = $2, rejected_at = $3, rejection_reason = $4
         WHERE request_id = $5`,
        [RequestStatus.REJECTED, ownerId, event.created_at, reason, requestId]
      );

      await client.query('COMMIT');

      logger.info('✅ Request rejected', { requestId, ownerId, reason });

      return { eventId: event.event_id };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('❌ Reject request failed', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Step 3: Attendant executes approved dispatch with photo evidence
   * Creates DISPATCH_EXECUTED event and DECREMENTS stock
   */
  async executeDispatch(
    requestId: string,
    attendantId: string,
    photoUrl: string
  ): Promise<{ eventId: string; newStockLevel: number }> {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // Get request details
      const requestResult = await client.query(
        'SELECT * FROM request_projections WHERE request_id = $1',
        [requestId]
      );

      if (requestResult.rows.length === 0) {
        throw new AppError('Request not found', 404);
      }

      const request = requestResult.rows[0];

      if (request.status !== RequestStatus.APPROVED) {
        throw new AppError('Request must be approved before execution', 400);
      }

      if (request.executed_at) {
        throw new AppError('Request already executed', 400);
      }

      // Verify attendant has access to this warehouse
      const attendantCheck = await client.query(
        'SELECT 1 FROM attendant_warehouses WHERE attendant_id = $1 AND warehouse_id = $2',
        [attendantId, request.warehouse_id]
      );

      if (attendantCheck.rows.length === 0) {
        throw new AppError('Attendant not assigned to this warehouse', 403);
      }

      // Final stock check
      const stock = await stockProjectionService.getCurrentStock(request.warehouse_id);
      const currentBags = stock.find(s => s.cropType === request.crop)?.bags || 0;

      if (currentBags < request.bag_quantity) {
        throw new AppError(
          `Insufficient stock. Required: ${request.bag_quantity}, Available: ${currentBags}`,
          400
        );
      }

      const payload: DispatchExecutedPayload = {
        request_id: requestId,
        crop_type: request.crop,
        bags: request.bag_quantity,
        recipient_name: request.buyer_name,
        photo_url: photoUrl,
      };

      // Create immutable event (THIS DECREMENTS STOCK)
      const event = await eventService.createEvent(
        request.warehouse_id,
        EventType.DISPATCH_EXECUTED,
        attendantId,
        payload,
        client
      );

      // Update request projection
      await client.query(
        `UPDATE request_projections 
         SET status = $1, executed_by = $2, executed_at = $3, photo_url = $4
         WHERE request_id = $5`,
        [RequestStatus.EXECUTED, attendantId, event.created_at, photoUrl, requestId]
      );

      // Rebuild stock projections to reflect new stock level
      await stockProjectionService.rebuildProjections(request.warehouse_id, client);

      await client.query('COMMIT');

      // Get new stock level
      const newStock = await stockProjectionService.getCurrentStock(request.warehouse_id);
      const newBags = newStock.find(s => s.cropType === request.crop)?.bags || 0;

      logger.info('✅ Dispatch executed', {
        requestId,
        attendantId,
        cropType: request.crop,
        bags: request.bag_quantity,
        oldStock: currentBags,
        newStock: newBags,
      });

      return { eventId: event.event_id, newStockLevel: newBags };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('❌ Execute dispatch failed', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all requests for a warehouse
   */
  async getWarehouseRequests(
    warehouseId: string,
    status?: RequestStatus
  ): Promise<any[]> {
    let query = `
      SELECT 
        rp.*,
        requester.name as requester_name,
        approver.name as approver_name,
        rejector.name as rejector_name,
        executor.name as executor_name
      FROM request_projections rp
      LEFT JOIN users requester ON rp.requested_by = requester.id
      LEFT JOIN users approver ON rp.approved_by = approver.id
      LEFT JOIN users rejector ON rp.rejected_by = rejector.id
      LEFT JOIN users executor ON rp.executed_by = executor.id
      WHERE rp.warehouse_id = $1
    `;

    const params: any[] = [warehouseId];

    if (status) {
      query += ' AND rp.status = $2';
      params.push(status);
    }

    query += ' ORDER BY rp.requested_at DESC';

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Get requests by attendant
   */
  async getAttendantRequests(
    attendantId: string,
    warehouseId: string
  ): Promise<any[]> {
    const result = await db.query(
      `SELECT rp.*, requester.name as requester_name
       FROM request_projections rp
       LEFT JOIN users requester ON rp.requested_by = requester.id
       WHERE rp.warehouse_id = $1 AND rp.requested_by = $2
       ORDER BY rp.requested_at DESC`,
      [warehouseId, attendantId]
    );

    return result.rows;
  }
}

export default new OutboundService();
