import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import logger from '../config/logger';
import eventService from './EventService';
import stockProjectionService from './StockProjectionService';
import batchService from './BatchService';
import { EventType, RequestStatus, CropType, BuyerType, PaymentMethod, PaymentStatus } from '../types/enums';
import { 
  OutboundRequestedPayload, 
  OutboundApprovedPayload, 
  OutboundRejectedPayload,
  DispatchExecutedPayload,
  PaymentConfirmedPayload
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

      const payload: OutboundRequestedPayload = {
        request_id: requestId,
        crop: cropType,
        bag_quantity: bags,
        buyer_name: recipientName,
        buyer_phone: '',
        notes: notes || undefined,
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
   * Extended with v2 commercial details (batch, buyer, payment)
   */
  async approveRequest(
    requestId: string,
    ownerId: string,
    notes?: string,
    // v2 parameters (all optional for backward compatibility)
    batchBreakdown?: Array<{ batch_id: string; bags: number }>,
    buyerType?: BuyerType,
    buyerNameFinal?: string,
    buyerPhoneFinal?: string,
    paymentMethod?: PaymentMethod,
    pricePerBag?: number
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

      // v2: Validate batch allocation if provided
      if (batchBreakdown && batchBreakdown.length > 0) {
        // Validate total bags match
        const totalBatched = batchBreakdown.reduce((sum, b) => sum + b.bags, 0);
        if (totalBatched !== request.bag_quantity) {
          throw new AppError(
            `Batch allocation mismatch: ${totalBatched} bags allocated, but ${request.bag_quantity} requested`,
            400
          );
        }

        // Validate batches exist and have enough inventory
        const validation = await batchService.validateBatchAllocation(
          request.warehouse_id,
          request.crop,
          batchBreakdown
        );

        if (!validation.valid) {
          throw new AppError(validation.error || 'Invalid batch allocation', 400);
        }
      }

      // v2: Calculate payment details
      let totalAmount: number | undefined;
      let finalPaymentStatus: PaymentStatus | undefined;
      
      if (pricePerBag && pricePerBag > 0) {
        totalAmount = pricePerBag * request.bag_quantity;
        
        // Auto-determine payment status based on method
        if (paymentMethod) {
          finalPaymentStatus = paymentMethod === PaymentMethod.CREDIT 
            ? PaymentStatus.PENDING 
            : PaymentStatus.PAID;
        }
      }

      const payload: OutboundApprovedPayload = {
        request_id: requestId,
        approved_by: ownerId,
        notes: notes || undefined,
        // v2 fields
        batch_breakdown: batchBreakdown,
        buyer_type: buyerType,
        buyer_name_final: buyerNameFinal,
        buyer_phone_final: buyerPhoneFinal,
        payment_method: paymentMethod,
        payment_status: finalPaymentStatus,
        price_per_bag: pricePerBag,
        total_amount: totalAmount,
      };

      // Create immutable event
      const event = await eventService.createEvent(
        request.warehouse_id,
        EventType.OUTBOUND_APPROVED,
        ownerId,
        payload,
        client
      );

      // Update request projection - only update buyer_name if provided
      const updateFields = [
        'status = $1',
        'approved_by = $2', 
        'approved_at = $3',
        'buyer_type = $4',
        'buyer_phone_updated = $5',
        'payment_method = $6',
        'payment_status = $7',
        'price_per_bag = $8',
        'total_amount = $9'
      ];
      const updateValues: any[] = [
        RequestStatus.APPROVED,
        ownerId,
        event.created_at,
        buyerType || null,
        buyerPhoneFinal || null,
        paymentMethod || null,
        finalPaymentStatus || null,
        pricePerBag || null,
        totalAmount || null,
      ];
      
      // Only update buyer_name if provided (it has NOT NULL constraint)
      if (buyerNameFinal) {
        updateFields.push('buyer_name = $10');
        updateValues.push(buyerNameFinal);
      }
      
      updateValues.push(requestId); // WHERE clause parameter
      
      await client.query(
        `UPDATE request_projections 
         SET ${updateFields.join(', ')}
         WHERE request_id = $${updateValues.length}`,
        updateValues
      );

      // v2: Record batch allocation if provided
      if (batchBreakdown && batchBreakdown.length > 0) {
        await batchService.recordBatchAllocation(
          requestId,
          batchBreakdown,
          client
        );
      }

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
        rejected_by: ownerId,
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
      const currentBags = stock.find(s => s.crop === request.crop)?.bag_count || 0;

      if (currentBags < request.bag_quantity) {
        throw new AppError(
          `Insufficient stock. Required: ${request.bag_quantity}, Available: ${currentBags}`,
          400
        );
      }

      const payload: DispatchExecutedPayload = {
        request_id: requestId,
        executed_by: attendantId,
        photo_urls: [photoUrl],
        notes: undefined,
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

      // CRITICAL FIX: Deduct bags from batch(es)
      // If specific batches were allocated, deduct from those batches
      const allocations = await batchService.getRequestBatchAllocations(requestId);
      
      if (allocations.length > 0) {
        // Batch-specific deduction (owner selected specific batches)
        for (const allocation of allocations) {
          await batchService.updateRemainingBags(
            allocation.batch_id,
            allocation.bags_allocated,
            client
          );
        }
        logger.info('✅ Batch remaining bags deducted (allocated mode)', {
          requestId,
          batchCount: allocations.length,
        });
      } else {
        // FIFO mode: deduct from oldest batch(es) with matching crop
        const availableBatches = await batchService.getWarehouseBatches(
          request.warehouse_id,
          request.crop,
          true // onlyAvailable
        );
        
        let remainingToDeduct = request.bag_quantity;
        
        for (const batch of availableBatches) {
          if (remainingToDeduct <= 0) break;
          
          const deductFromThisBatch = Math.min(batch.remaining_bags, remainingToDeduct);
          await batchService.updateRemainingBags(
            batch.id,
            deductFromThisBatch,
            client
          );
          remainingToDeduct -= deductFromThisBatch;
        }
        
        logger.info('✅ Batch remaining bags deducted (FIFO mode)', {
          requestId,
          totalBags: request.bag_quantity,
          batchesUsed: availableBatches.length,
        });
      }

      await client.query('COMMIT');

      // Get new stock level
      const newStock = await stockProjectionService.getCurrentStock(request.warehouse_id);
      const newBags = newStock.find(s => s.crop === request.crop)?.bag_count || 0;

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

  /**
   * Confirm Payment (Attendant only - for CREDIT payments)
   * Creates PAYMENT_CONFIRMED event
   */
  async confirmPayment(
    requestId: string,
    attendantId: string,
    photoUrls?: string[],
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

      if (request.status !== RequestStatus.EXECUTED) {
        throw new AppError('Payment can only be confirmed for executed dispatches', 400);
      }

      if (request.payment_status !== PaymentStatus.PENDING) {
        throw new AppError(
          `Payment status is ${request.payment_status || 'N/A'}, not PENDING`,
          400
        );
      }

      // Verify attendant has access to this warehouse
      const attendantCheck = await client.query(
        'SELECT 1 FROM attendant_warehouses WHERE attendant_id = $1 AND warehouse_id = $2',
        [attendantId, request.warehouse_id]
      );

      if (attendantCheck.rows.length === 0) {
        throw new AppError('Attendant not assigned to this warehouse', 403);
      }

      const payload: PaymentConfirmedPayload = {
        request_id: requestId,
        confirmed_by: attendantId,
        photo_urls: photoUrls,
        notes: notes || undefined,
      };

      // Create immutable event
      const event = await eventService.createEvent(
        request.warehouse_id,
        EventType.PAYMENT_CONFIRMED,
        attendantId,
        payload,
        client
      );

      // Update request projection
      await client.query(
        `UPDATE request_projections 
         SET payment_status = $1, payment_confirmed_by = $2, payment_confirmed_at = $3
         WHERE request_id = $4`,
        [PaymentStatus.CONFIRMED, attendantId, event.created_at, requestId]
      );

      await client.query('COMMIT');

      logger.info('✅ Payment confirmed', {
        requestId,
        attendantId,
        hadPhotos: !!(photoUrls && photoUrls.length > 0),
      });

      return { eventId: event.event_id };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('❌ Confirm payment failed', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new OutboundService();
