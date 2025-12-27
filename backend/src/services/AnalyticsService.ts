import db from '../config/database';
import logger from '../config/logger';
import { CropType, BuyerType, PaymentStatus } from '../types/enums';
import { AppError } from '../middleware/errorHandler';

/**
 * AnalyticsService
 * 
 * Provides read-only analytics for Owner Dashboard
 * All data derived from events and projections
 * Multi-owner safe - checks warehouse access
 * 
 * RULES:
 * - Read-only (no mutations)
 * - Derived from events/projections
 * - Multi-owner aware
 * - No business logic changes
 */
export class AnalyticsService {
  /**
   * Get executive snapshot for warehouse
   * Summary metrics for dashboard landing
   */
  async getExecutiveSnapshot(warehouseId: string): Promise<{
    totalStockBags: number;
    stockBySource: { ownFarm: number; sme: number; smallFarmer: number };
    activeBatches: number;
    pendingRequests: number;
    outstandingCreditTotal: number;
    toolsAssigned: number;
  }> {
    try {
      // Total stock
      const stockResult = await db.query(
        `SELECT COALESCE(SUM(bag_count), 0) AS total_bags
         FROM stock_projections
         WHERE warehouse_id = $1`,
        [warehouseId]
      );

      // Stock by source (from batches)
      const sourceResult = await db.query(
        `SELECT 
           source_type,
           SUM(remaining_bags) AS bags
         FROM batches
         WHERE warehouse_id = $1
         GROUP BY source_type`,
        [warehouseId]
      );

      const stockBySource = {
        ownFarm: 0,
        sme: 0,
        smallFarmer: 0,
      };

      sourceResult.rows.forEach((row) => {
        if (row.source_type === 'OWN_FARM') stockBySource.ownFarm = parseInt(row.bags);
        if (row.source_type === 'SME') stockBySource.sme = parseInt(row.bags);
        if (row.source_type === 'SMALL_FARMER') stockBySource.smallFarmer = parseInt(row.bags);
      });

      // Active batches
      const batchResult = await db.query(
        `SELECT COUNT(*) AS count
         FROM batches
         WHERE warehouse_id = $1 AND remaining_bags > 0`,
        [warehouseId]
      );

      // Pending requests
      const requestResult = await db.query(
        `SELECT COUNT(*) AS count
         FROM request_projections
         WHERE warehouse_id = $1 AND status = 'PENDING'`,
        [warehouseId]
      );

      // Outstanding credit
      const creditResult = await db.query(
        `SELECT COALESCE(SUM(total_amount), 0) AS total
         FROM transaction_projections
         WHERE warehouse_id = $1 
         AND payment_method = 'CREDIT'
         AND payment_status = 'PENDING'`,
        [warehouseId]
      );

      // Tools assigned
      const toolsResult = await db.query(
        `SELECT COUNT(*) AS count
         FROM tools
         WHERE warehouse_id = $1 AND status = 'ASSIGNED'`,
        [warehouseId]
      );

      return {
        totalStockBags: parseInt(stockResult.rows[0].total_bags),
        stockBySource,
        activeBatches: parseInt(batchResult.rows[0].count),
        pendingRequests: parseInt(requestResult.rows[0].count),
        outstandingCreditTotal: parseFloat(creditResult.rows[0].total),
        toolsAssigned: parseInt(toolsResult.rows[0].count),
      };
    } catch (error) {
      logger.error('Failed to get executive snapshot', error);
      throw new AppError('Failed to retrieve dashboard summary', 500);
    }
  }

  /**
   * Get transaction history with full details
   * Paginated, filterable by status/crop/buyer type
   */
  async getTransactionHistory(
    warehouseId: string,
    options: {
      limit?: number;
      offset?: number;
      crop?: CropType;
      buyerType?: BuyerType;
      paymentStatus?: PaymentStatus;
      status?: string;
    } = {}
  ): Promise<{
    transactions: any[];
    total: number;
  }> {
    try {
      const { limit = 50, offset = 0, crop, buyerType, paymentStatus, status } = options;

      let whereConditions = ['tp.warehouse_id = $1'];
      const params: any[] = [warehouseId];
      let paramCount = 1;

      if (crop) {
        paramCount++;
        whereConditions.push(`tp.crop = $${paramCount}`);
        params.push(crop);
      }

      if (buyerType) {
        paramCount++;
        whereConditions.push(`tp.buyer_type = $${paramCount}`);
        params.push(buyerType);
      }

      if (paymentStatus) {
        paramCount++;
        whereConditions.push(`tp.payment_status = $${paramCount}`);
        params.push(paymentStatus);
      }

      if (status) {
        paramCount++;
        whereConditions.push(`tp.current_status = $${paramCount}`);
        params.push(status);
      }

      const whereClause = whereConditions.join(' AND ');

      // Get total count
      const countResult = await db.query(
        `SELECT COUNT(*) AS total
         FROM transaction_projections tp
         WHERE ${whereClause}`,
        params
      );

      // Get transactions with joined user details
      const transactions = await db.query(
        `SELECT 
           tp.*,
           requester.name AS requester_name,
           approver.name AS approver_name,
           executor.name AS executor_name,
           confirmer.name AS confirmer_name
         FROM transaction_projections tp
         LEFT JOIN users requester ON tp.requested_by = requester.id
         LEFT JOIN users approver ON tp.approved_by = approver.id
         LEFT JOIN users executor ON tp.executed_by = executor.id
         LEFT JOIN users confirmer ON tp.payment_confirmed_by = confirmer.id
         WHERE ${whereClause}
         ORDER BY tp.transaction_date DESC
         LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
        [...params, limit, offset]
      );

      return {
        transactions: transactions.rows,
        total: parseInt(countResult.rows[0].total),
      };
    } catch (error) {
      logger.error('Failed to get transaction history', error);
      throw new AppError('Failed to retrieve transaction history', 500);
    }
  }

  /**
   * Get transaction details including batch breakdown
   */
  async getTransactionDetails(requestId: string, warehouseId: string): Promise<any> {
    try {
      // Get transaction
      const transactionResult = await db.query(
        `SELECT 
           tp.*,
           requester.name AS requester_name,
           approver.name AS approver_name,
           executor.name AS executor_name,
           confirmer.name AS confirmer_name
         FROM transaction_projections tp
         LEFT JOIN users requester ON tp.requested_by = requester.id
         LEFT JOIN users approver ON tp.approved_by = approver.id
         LEFT JOIN users executor ON tp.executed_by = executor.id
         LEFT JOIN users confirmer ON tp.payment_confirmed_by = confirmer.id
         WHERE tp.request_id = $1 AND tp.warehouse_id = $2`,
        [requestId, warehouseId]
      );

      if (transactionResult.rows.length === 0) {
        throw new AppError('Transaction not found', 404);
      }

      const transaction = transactionResult.rows[0];

      // Get batch breakdown
      const batchesResult = await db.query(
        `SELECT 
           ba.bags_allocated,
           b.id AS batch_id,
           b.crop_type,
           b.source_type,
           b.source_name
         FROM batch_allocations ba
         INNER JOIN batches b ON ba.batch_id = b.id
         WHERE ba.request_id = $1`,
        [requestId]
      );

      // Get event timeline
      const eventsResult = await db.query(
        `SELECT event_id, event_type, created_at, actor_id
         FROM events
         WHERE warehouse_id = $1
         AND payload->>'request_id' = $2
         ORDER BY created_at ASC`,
        [warehouseId, requestId]
      );

      return {
        ...transaction,
        batch_breakdown: batchesResult.rows,
        event_timeline: eventsResult.rows,
      };
    } catch (error) {
      logger.error('Failed to get transaction details', error);
      throw error instanceof AppError ? error : new AppError('Failed to retrieve transaction details', 500);
    }
  }

  /**
   * Get batch analytics with aging indicators
   */
  async getBatchAnalytics(warehouseId: string): Promise<any[]> {
    try {
      const result = await db.query(
        `SELECT * FROM batch_aging
         WHERE warehouse_id = $1
         ORDER BY days_old DESC`,
        [warehouseId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Failed to get batch analytics', error);
      throw new AppError('Failed to retrieve batch analytics', 500);
    }
  }

  /**
   * Get outstanding credit with buyer details
   */
  async getOutstandingCredit(warehouseId: string): Promise<any[]> {
    try {
      const result = await db.query(
        `SELECT * FROM outstanding_credit
         WHERE warehouse_id = $1
         ORDER BY days_outstanding DESC`,
        [warehouseId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Failed to get outstanding credit', error);
      throw new AppError('Failed to retrieve outstanding credit', 500);
    }
  }

  /**
   * Get buyer and market breakdown
   */
  async getBuyerBreakdown(warehouseId: string): Promise<{
    byBuyerType: any[];
    topBuyers: any[];
  }> {
    try {
      // Aggregated by buyer type
      const byTypeResult = await db.query(
        `SELECT 
           buyer_type,
           COUNT(*) AS transaction_count,
           SUM(bag_quantity) AS total_bags,
           SUM(total_amount) AS total_revenue
         FROM transaction_projections
         WHERE warehouse_id = $1 
         AND current_status = 'EXECUTED'
         AND buyer_type IS NOT NULL
         GROUP BY buyer_type
         ORDER BY total_revenue DESC`,
        [warehouseId]
      );

      // Top named buyers
      const topBuyersResult = await db.query(
        `SELECT 
           buyer_name,
           buyer_type,
           COUNT(*) AS transaction_count,
           SUM(bag_quantity) AS total_bags,
           SUM(total_amount) AS total_revenue
         FROM transaction_projections
         WHERE warehouse_id = $1 
         AND current_status = 'EXECUTED'
         AND buyer_name IS NOT NULL
         AND buyer_name != 'TBD'
         GROUP BY buyer_name, buyer_type
         ORDER BY total_revenue DESC
         LIMIT 10`,
        [warehouseId]
      );

      return {
        byBuyerType: byTypeResult.rows,
        topBuyers: topBuyersResult.rows,
      };
    } catch (error) {
      logger.error('Failed to get buyer breakdown', error);
      throw new AppError('Failed to retrieve buyer analytics', 500);
    }
  }

  /**
   * Get tool accountability dashboard
   */
  async getToolDashboard(warehouseId: string): Promise<any[]> {
    try {
      const result = await db.query(
        `SELECT 
           t.id,
           t.tool_type,
           t.internal_tag,
           t.status,
           t.assigned_to_attendant_id,
           attendant.name AS attendant_name,
           EXTRACT(DAY FROM (CURRENT_TIMESTAMP - 
             (SELECT e.created_at 
              FROM events e 
              WHERE e.event_type = 'TOOL_ASSIGNED' 
              AND e.payload->>'tool_id' = t.id::text
              ORDER BY e.created_at DESC LIMIT 1)
           )) AS days_held
         FROM tools t
         LEFT JOIN users attendant ON t.assigned_to_attendant_id = attendant.id
         WHERE t.warehouse_id = $1
         ORDER BY t.status, t.tool_type`,
        [warehouseId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Failed to get tool dashboard', error);
      throw new AppError('Failed to retrieve tool dashboard', 500);
    }
  }

  /**
   * Get tool assignment history for specific tool
   */
  async getToolHistory(toolId: string, warehouseId: string): Promise<any[]> {
    try {
      const result = await db.query(
        `SELECT 
           e.event_id,
           e.event_type,
           e.created_at,
           u.name AS actor_name,
           e.payload
         FROM events e
         INNER JOIN users u ON e.actor_id = u.id
         WHERE e.warehouse_id = $1
         AND e.payload->>'tool_id' = $2
         AND e.event_type IN ('TOOL_ASSIGNED', 'TOOL_RETURNED')
         ORDER BY e.created_at DESC`,
        [warehouseId, toolId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Failed to get tool history', error);
      throw new AppError('Failed to retrieve tool history', 500);
    }
  }

  /**
   * Get attendant activity summary
   */
  async getAttendantActivity(warehouseId: string): Promise<any[]> {
    try {
      const result = await db.query(
        `SELECT * FROM attendant_activity
         WHERE warehouse_id = $1
         ORDER BY requests_submitted DESC`,
        [warehouseId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Failed to get attendant activity', error);
      throw new AppError('Failed to retrieve attendant activity', 500);
    }
  }

  /**
   * Verify user has owner access to warehouse (multi-owner safe)
   */
  async verifyOwnerAccess(userId: string, warehouseId: string): Promise<boolean> {
    try {
      const result = await db.query(
        `SELECT is_warehouse_owner($1, $2) AS has_access`,
        [userId, warehouseId]
      );

      return result.rows[0].has_access;
    } catch (error) {
      logger.error('Failed to verify owner access', error);
      return false;
    }
  }

  /**
   * Get all warehouses for an owner (multi-owner support)
   */
  async getOwnerWarehouses(userId: string): Promise<any[]> {
    try {
      const result = await db.query(
        `SELECT * FROM get_owner_warehouses($1)`,
        [userId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Failed to get owner warehouses', error);
      throw new AppError('Failed to retrieve warehouses', 500);
    }
  }
}

export default new AnalyticsService();
