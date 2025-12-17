import { v4 as uuidv4 } from 'uuid';
import { PoolClient } from 'pg';
import db from '../config/database';
import logger from '../config/logger';
import { Event, EventPayload } from '../types/models';
import { EventType } from '../types/enums';

/**
 * EventService - THE HEART OF THE SYSTEM
 * Manages the append-only event log
 * All business logic flows through event creation
 * NO UPDATES, NO DELETES - only appends
 */
export class EventService {
  /**
   * Create a new event (append-only)
   * This is the ONLY way to modify system state
   * Server timestamp is authoritative
   */
  async createEvent(
    warehouseId: string,
    eventType: EventType,
    actorId: string,
    payload: EventPayload,
    client?: PoolClient
  ): Promise<Event> {
    const eventId = uuidv4();
    const createdAt = new Date();

    const query = `
      INSERT INTO events (event_id, warehouse_id, event_type, actor_id, payload, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [eventId, warehouseId, eventType, actorId, payload, createdAt];

    try {
      const executor = client || db;
      const result = await executor.query(query, values);
      const event = this.mapRowToEvent(result.rows[0]);

      logger.info(`✅ Event created: ${eventType}`, {
        eventId,
        warehouseId,
        actorId,
        sequence: event.sequence_number,
      });

      return event;
    } catch (error) {
      logger.error('❌ Failed to create event', {
        eventType,
        warehouseId,
        actorId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Failed to create event: ' + (error instanceof Error ? error.message : 'Unknown'));
    }
  }

  /**
   * Get events by warehouse
   */
  async getEventsByWarehouse(
    warehouseId: string,
    options: {
      sinceSequence?: number;
      limit?: number;
      eventTypes?: EventType[];
    } = {}
  ): Promise<Event[]> {
    let query = `
      SELECT * FROM events
      WHERE warehouse_id = $1
    `;

    const params: unknown[] = [warehouseId];
    let paramCount = 1;

    if (options.sinceSequence !== undefined) {
      paramCount++;
      query += ` AND sequence_number > $${paramCount}`;
      params.push(options.sinceSequence);
    }

    if (options.eventTypes && options.eventTypes.length > 0) {
      paramCount++;
      query += ` AND event_type = ANY($${paramCount})`;
      params.push(options.eventTypes);
    }

    query += ` ORDER BY sequence_number ASC`;

    if (options.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(options.limit);
    }

    const result = await db.query(query, params);
    return result.rows.map(this.mapRowToEvent);
  }

  /**
   * Get event by ID
   */
  async getEventById(eventId: string): Promise<Event | null> {
    const result = await db.query(
      'SELECT * FROM events WHERE event_id = $1',
      [eventId]
    );

    if (result.rows.length === 0) return null;
    return this.mapRowToEvent(result.rows[0]);
  }

  /**
   * Get latest sequence number for warehouse
   */
  async getLatestSequence(warehouseId: string): Promise<number> {
    const result = await db.query(
      'SELECT MAX(sequence_number) as max_seq FROM events WHERE warehouse_id = $1',
      [warehouseId]
    );

    return result.rows[0]?.max_seq || 0;
  }

  /**
   * Check if event already exists (idempotency)
   * Useful for duplicate detection
   */
  async eventExists(
    warehouseId: string,
    eventType: EventType,
    uniqueKey: string // e.g., request_id for approvals
  ): Promise<boolean> {
    const result = await db.query(
      `SELECT event_id FROM events 
       WHERE warehouse_id = $1 
       AND event_type = $2 
       AND payload->>'request_id' = $3
       LIMIT 1`,
      [warehouseId, eventType, uniqueKey]
    );

    return result.rows.length > 0;
  }

  /**
   * Get all events (for admin/debugging)
   */
  async getAllEvents(limit: number = 100): Promise<Event[]> {
    const result = await db.query(
      'SELECT * FROM events ORDER BY created_at DESC LIMIT $1',
      [limit]
    );

    return result.rows.map(this.mapRowToEvent);
  }

  /**
   * Get events by actor (user)
   */
  async getEventsByActor(actorId: string, limit: number = 50): Promise<Event[]> {
    const result = await db.query(
      'SELECT * FROM events WHERE actor_id = $1 ORDER BY created_at DESC LIMIT $2',
      [actorId, limit]
    );

    return result.rows.map(this.mapRowToEvent);
  }

  /**
   * Get audit trail for warehouse (ordered by sequence)
   */
  async getAuditTrail(
    warehouseId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ events: Event[]; total: number }> {
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    const [eventsResult, countResult] = await Promise.all([
      db.query(
        `SELECT * FROM events 
         WHERE warehouse_id = $1 
         ORDER BY sequence_number DESC 
         LIMIT $2 OFFSET $3`,
        [warehouseId, limit, offset]
      ),
      db.query(
        'SELECT COUNT(*) as total FROM events WHERE warehouse_id = $1',
        [warehouseId]
      ),
    ]);

    return {
      events: eventsResult.rows.map(this.mapRowToEvent),
      total: parseInt(countResult.rows[0].total),
    };
  }

  /**
   * Map database row to Event object
   */
  private mapRowToEvent(row: unknown): Event {
    const r = row as Record<string, unknown>;
    return {
      event_id: r.event_id as string,
      warehouse_id: r.warehouse_id as string,
      event_type: r.event_type as EventType,
      actor_id: r.actor_id as string,
      payload: r.payload as EventPayload,
      created_at: new Date(r.created_at as string),
      sequence_number: Number(r.sequence_number),
    };
  }
}

export default new EventService();
