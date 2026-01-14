import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import logger from '../config/logger';
import { User, TokenPayload } from '../types/models';
import { UserRole } from '../types/enums';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * AuthService
 * Handles authentication, authorization, and user management
 * Enforces HARD role separation
 */
export class AuthService {
  /**
   * Create a new user (Admin only)
   */
  async createUser(
    name: string,
    phone: string,
    pin: string,
    role: UserRole,
    warehouseId: string | null
  ): Promise<User> {
    // Validate role and warehouse relationship
    if (role !== UserRole.PLATFORM_ADMIN && !warehouseId) {
      throw new Error('Owners and Attendants must be assigned to a warehouse');
    }

    if (role === UserRole.PLATFORM_ADMIN && warehouseId) {
      throw new Error('Platform Admins cannot be assigned to a warehouse');
    }

    // Check if phone already exists
    const existing = await db.query('SELECT id FROM users WHERE phone = $1', [phone]);
    if (existing.rows.length > 0) {
      throw new Error('Phone number already registered');
    }

    // Hash PIN
    const hashedPin = await bcrypt.hash(pin, 10);
    const userId = uuidv4();

    const result = await db.query(
      `INSERT INTO users (id, name, phone, role, hashed_pin, warehouse_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, name, phone, role, hashedPin, warehouseId]
    );

    // If creating a field agent, also create field_agents record and link to warehouse
    if (role === UserRole.FIELD_AGENT && warehouseId) {
      await db.query(
        `INSERT INTO field_agents (id, name, phone, community, status, created_by)
         VALUES ($1, $2, $3, 'N/A', 'ACTIVE', $1)
         ON CONFLICT (id) DO NOTHING`,
        [userId, name, phone]
      );

      await db.query(
        `INSERT INTO warehouse_field_agents (warehouse_id, field_agent_id, assigned_by)
         VALUES ($1, $2, $2)
         ON CONFLICT (warehouse_id, field_agent_id) DO NOTHING`,
        [warehouseId, userId]
      );

      logger.info('✅ Field agent linked to warehouse', { userId, warehouseId });
    }

    // Link attendants and field agents to attendant_warehouses table
    if ((role === UserRole.ATTENDANT || role === UserRole.FIELD_AGENT) && warehouseId) {
      await db.query(
        `INSERT INTO attendant_warehouses (attendant_id, warehouse_id)
         VALUES ($1, $2)
         ON CONFLICT (attendant_id, warehouse_id) DO NOTHING`,
        [userId, warehouseId]
      );

      logger.info('✅ Attendant/Field agent assigned to warehouse', { userId, warehouseId });
    }

    logger.info('✅ User created', { userId, role, phone });
    return this.mapRowToUser(result.rows[0]);
  }

  /**
   * Login with phone and PIN
   */
  async login(phone: string, pin: string): Promise<{
    user: User;
    warehouse: { id: string; name: string } | null;
    accessToken: string;
    refreshToken: string;
  }> {
    const result = await db.query(
      `SELECT u.*, w.id as warehouse_id, w.name as warehouse_name
       FROM users u
       LEFT JOIN warehouses w ON u.warehouse_id = w.id
       WHERE u.phone = $1`,
      [phone]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid credentials');
    }

    const row = result.rows[0];
    const user = this.mapRowToUser(row);

    // Verify PIN
    const isValidPin = await bcrypt.compare(pin, user.hashed_pin);
    if (!isValidPin) {
      throw new Error('Invalid credentials');
    }

    // Generate tokens
    const tokenPayload: TokenPayload = {
      user_id: user.id,
      role: user.role,
      warehouse_id: user.warehouse_id,
    };

    const accessToken = jwt.sign(tokenPayload, JWT_SECRET as string, {
      expiresIn: JWT_EXPIRES_IN,
    } as SignOptions);

    const refreshToken = jwt.sign(tokenPayload, JWT_REFRESH_SECRET as string, {
      expiresIn: JWT_REFRESH_EXPIRES_IN,
    } as SignOptions);

    const warehouse = row.warehouse_id
      ? { id: row.warehouse_id, name: row.warehouse_name }
      : null;

    logger.info('✅ User logged in', { userId: user.id, role: user.role });

    return { user, warehouse, accessToken, refreshToken };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<string> {
    try {
      const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as TokenPayload;

      const newAccessToken = jwt.sign(
        {
          user_id: payload.user_id,
          role: payload.role,
          warehouse_id: payload.warehouse_id,
        },
        JWT_SECRET as string,
        { expiresIn: JWT_EXPIRES_IN } as SignOptions
      );

      return newAccessToken;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Verify and decode access token
   */
  verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) return null;
    return this.mapRowToUser(result.rows[0]);
  }

  /**
   * Get all users (Admin only)
   */
  async getAllUsers(): Promise<User[]> {
    const result = await db.query('SELECT * FROM users ORDER BY created_at DESC');
    return result.rows.map(this.mapRowToUser);
  }

  /**
   * Get users by warehouse
   */
  async getUsersByWarehouse(warehouseId: string): Promise<User[]> {
    const result = await db.query(
      'SELECT * FROM users WHERE warehouse_id = $1 ORDER BY role, name',
      [warehouseId]
    );
    return result.rows.map(this.mapRowToUser);
  }

  /**
   * Assign attendant or field agent to warehouse
   */
  async assignAttendantToWarehouse(
    attendantId: string,
    warehouseId: string
  ): Promise<void> {
    // Verify user is attendant or field agent
    const user = await this.getUserById(attendantId);
    if (!user || (user.role !== UserRole.ATTENDANT && user.role !== UserRole.FIELD_AGENT)) {
      throw new Error('User is not an attendant or field agent');
    }

    await db.query(
      `INSERT INTO attendant_warehouses (attendant_id, warehouse_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [attendantId, warehouseId]
    );

    logger.info('✅ Attendant assigned to warehouse', { attendantId, warehouseId });
  }

  /**
   * Check if user has permission for action
   * Role-based access control enforcement
   */
  hasPermission(userRole: UserRole, requiredRole: UserRole | UserRole[]): boolean {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    return roles.includes(userRole);
  }

  /**
   * Map database row to User
   */
  private mapRowToUser(row: unknown): User {
    const r = row as Record<string, unknown>;
    return {
      id: r.id as string,
      name: r.name as string,
      phone: r.phone as string,
      role: r.role as UserRole,
      hashed_pin: r.hashed_pin as string,
      warehouse_id: r.warehouse_id as string | null,
      created_at: new Date(r.created_at as string),
      updated_at: new Date(r.updated_at as string),
    };
  }
}

export default new AuthService();
