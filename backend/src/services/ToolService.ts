import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import logger from '../config/logger';
import eventService from './EventService';
import { EventType, ToolStatus } from '../types/enums';
import { Tool, ToolAssignedPayload, ToolReturnedPayload } from '../types/models';
import { AppError } from '../middleware/errorHandler';

/**
 * ToolService
 * Manages tool inventory and assignment tracking
 * 
 * CRITICAL RULES:
 * - Tools are created during genesis/onboarding
 * - Each tool gets a unique internal tag (e.g., "HOE-001")
 * - Assignments/returns create immutable events
 * - Only one attendant can be assigned per tool at a time
 */
export class ToolService {
  /**
   * Create tools during warehouse setup
   * Expands quantity into individual tool records
   */
  async createTools(
    warehouseId: string,
    toolType: string,
    quantity: number,
    createdBy: string
  ): Promise<Tool[]> {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      const tools: Tool[] = [];

      // Get existing count for this tool type to generate sequential tags
      const countResult = await client.query(
        `SELECT COUNT(*) as count FROM tools 
         WHERE warehouse_id = $1 AND tool_type = $2`,
        [warehouseId, toolType]
      );

      const startIndex = parseInt(countResult.rows[0].count) + 1;

      // Create individual tool records
      for (let i = 0; i < quantity; i++) {
        const toolId = uuidv4();
        const internalTag = this.generateInternalTag(toolType, startIndex + i);

        const result = await client.query(
          `INSERT INTO tools (
            id, warehouse_id, tool_type, internal_tag, status
          ) VALUES ($1, $2, $3, $4, $5)
          RETURNING *`,
          [toolId, warehouseId, toolType, internalTag, ToolStatus.AVAILABLE]
        );

        tools.push(this.mapRowToTool(result.rows[0]));
      }

      await client.query('COMMIT');

      logger.info('✅ Tools created', {
        warehouseId,
        toolType,
        quantity,
        startTag: tools[0]?.internal_tag,
      });

      return tools;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('❌ Create tools failed', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Assign tool to attendant (creates TOOL_ASSIGNED event)
   */
  async assignTool(
    toolId: string,
    attendantId: string,
    ownerId: string,
    notes?: string
  ): Promise<{ eventId: string }> {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // Get tool details
      const toolResult = await client.query(
        'SELECT * FROM tools WHERE id = $1',
        [toolId]
      );

      if (toolResult.rows.length === 0) {
        throw new AppError('Tool not found', 404);
      }

      const tool = this.mapRowToTool(toolResult.rows[0]);

      if (tool.status !== ToolStatus.AVAILABLE) {
        throw new AppError(
          `Tool ${tool.internal_tag} is not available (status: ${tool.status})`,
          400
        );
      }

      // Verify attendant belongs to this warehouse
      const attendantCheck = await client.query(
        `SELECT 1 FROM attendant_warehouses 
         WHERE attendant_id = $1 AND warehouse_id = $2`,
        [attendantId, tool.warehouse_id]
      );

      if (attendantCheck.rows.length === 0) {
        throw new AppError('Attendant not assigned to this warehouse', 403);
      }

      const payload: ToolAssignedPayload = {
        tool_id: toolId,
        assigned_to: attendantId,
        assigned_by: ownerId,
        notes: notes || undefined,
      };

      // Create immutable event
      const event = await eventService.createEvent(
        tool.warehouse_id,
        EventType.TOOL_ASSIGNED,
        ownerId,
        payload,
        client
      );

      // Update tool projection
      await client.query(
        `UPDATE tools 
         SET status = $1, assigned_to_attendant_id = $2
         WHERE id = $3`,
        [ToolStatus.ASSIGNED, attendantId, toolId]
      );

      await client.query('COMMIT');

      logger.info('✅ Tool assigned', {
        toolId,
        internalTag: tool.internal_tag,
        attendantId,
        ownerId,
      });

      return { eventId: event.event_id };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('❌ Assign tool failed', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Return tool (creates TOOL_RETURNED event)
   */
  async returnTool(
    toolId: string,
    attendantId: string,
    conditionNotes?: string
  ): Promise<{ eventId: string }> {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // Get tool details
      const toolResult = await client.query(
        'SELECT * FROM tools WHERE id = $1',
        [toolId]
      );

      if (toolResult.rows.length === 0) {
        throw new AppError('Tool not found', 404);
      }

      const tool = this.mapRowToTool(toolResult.rows[0]);

      if (tool.status !== ToolStatus.ASSIGNED) {
        throw new AppError('Tool is not currently assigned', 400);
      }

      if (tool.assigned_to_attendant_id !== attendantId) {
        throw new AppError('Tool is not assigned to you', 403);
      }

      const payload: ToolReturnedPayload = {
        tool_id: toolId,
        returned_by: attendantId,
        condition_notes: conditionNotes || undefined,
      };

      // Create immutable event
      const event = await eventService.createEvent(
        tool.warehouse_id,
        EventType.TOOL_RETURNED,
        attendantId,
        payload,
        client
      );

      // Update tool projection
      await client.query(
        `UPDATE tools 
         SET status = $1, assigned_to_attendant_id = NULL
         WHERE id = $2`,
        [ToolStatus.AVAILABLE, toolId]
      );

      await client.query('COMMIT');

      logger.info('✅ Tool returned', {
        toolId,
        internalTag: tool.internal_tag,
        attendantId,
      });

      return { eventId: event.event_id };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('❌ Return tool failed', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all tools for a warehouse
   */
  async getWarehouseTools(
    warehouseId: string,
    status?: ToolStatus
  ): Promise<Tool[]> {
    let query = `
      SELECT t.*, u.name as attendant_name
      FROM tools t
      LEFT JOIN users u ON t.assigned_to_attendant_id = u.id
      WHERE t.warehouse_id = $1
    `;

    const params: any[] = [warehouseId];

    if (status) {
      query += ' AND t.status = $2';
      params.push(status);
    }

    query += ' ORDER BY t.tool_type, t.internal_tag';

    const result = await db.query(query, params);
    return result.rows.map(row => this.mapRowToTool(row));
  }

  /**
   * Get tools assigned to a specific attendant
   */
  async getAttendantTools(attendantId: string): Promise<Tool[]> {
    const result = await db.query(
      `SELECT * FROM tools 
       WHERE assigned_to_attendant_id = $1 AND status = $2
       ORDER BY tool_type, internal_tag`,
      [attendantId, ToolStatus.ASSIGNED]
    );

    return result.rows.map(this.mapRowToTool);
  }

  /**
   * Generate internal tag (e.g., "HOE-001", "SHOVEL-042")
   */
  private generateInternalTag(toolType: string, index: number): string {
    const prefix = toolType.toUpperCase().replace(/\s+/g, '_');
    const paddedIndex = index.toString().padStart(3, '0');
    return `${prefix}-${paddedIndex}`;
  }

  /**
   * Map database row to Tool model
   */
  private mapRowToTool(row: any): Tool {
    return {
      id: row.id,
      warehouse_id: row.warehouse_id,
      tool_type: row.tool_type,
      internal_tag: row.internal_tag,
      status: row.status,
      assigned_to_attendant_id: row.assigned_to_attendant_id,
      created_at: row.created_at,
    };
  }
}

export default new ToolService();
