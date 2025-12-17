import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import logger from '../config/logger';
import { Warehouse } from '../types/models';
import { WarehouseStatus } from '../types/enums';

/**
 * WarehouseService
 * Manages warehouse CRUD operations
 */
export class WarehouseService {
  /**
   * Create a new warehouse
   * Admin only operation
   */
  async createWarehouse(
    name: string,
    location: string,
    ownerId: string
  ): Promise<Warehouse> {
    const warehouseId = uuidv4();

    const result = await db.query(
      `INSERT INTO warehouses (id, name, location, status, owner_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [warehouseId, name, location, WarehouseStatus.SETUP, ownerId]
    );

    logger.info('✅ Warehouse created', { warehouseId, name, ownerId });
    return this.mapRowToWarehouse(result.rows[0]);
  }

  /**
   * Get warehouse by ID
   */
  async getWarehouseById(warehouseId: string): Promise<Warehouse | null> {
    const result = await db.query(
      'SELECT * FROM warehouses WHERE id = $1',
      [warehouseId]
    );

    if (result.rows.length === 0) return null;
    return this.mapRowToWarehouse(result.rows[0]);
  }

  /**
   * Get all warehouses
   */
  async getAllWarehouses(): Promise<Warehouse[]> {
    const result = await db.query(
      'SELECT * FROM warehouses ORDER BY created_at DESC'
    );

    return result.rows.map(this.mapRowToWarehouse);
  }

  /**
   * Update warehouse status
   */
  async updateStatus(
    warehouseId: string,
    status: WarehouseStatus
  ): Promise<Warehouse> {
    const result = await db.query(
      `UPDATE warehouses 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [status, warehouseId]
    );

    if (result.rows.length === 0) {
      throw new Error('Warehouse not found');
    }

    logger.info('✅ Warehouse status updated', { warehouseId, status });
    return this.mapRowToWarehouse(result.rows[0]);
  }

  /**
   * Get warehouses by owner
   */
  async getWarehousesByOwner(ownerId: string): Promise<Warehouse[]> {
    const result = await db.query(
      'SELECT * FROM warehouses WHERE owner_id = $1 ORDER BY created_at DESC',
      [ownerId]
    );

    return result.rows.map(this.mapRowToWarehouse);
  }

  /**
   * Check if warehouse is in active status
   */
  async isActive(warehouseId: string): Promise<boolean> {
    const warehouse = await this.getWarehouseById(warehouseId);
    return warehouse?.status === WarehouseStatus.ACTIVE;
  }

  /**
   * Map database row to Warehouse
   */
  private mapRowToWarehouse(row: unknown): Warehouse {
    const r = row as Record<string, unknown>;
    return {
      id: r.id as string,
      name: r.name as string,
      location: r.location as string,
      status: r.status as WarehouseStatus,
      owner_id: r.owner_id as string,
      created_at: new Date(r.created_at as string),
      updated_at: new Date(r.updated_at as string),
    };
  }
}

export default new WarehouseService();
