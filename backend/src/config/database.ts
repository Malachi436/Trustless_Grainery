import { Pool, PoolClient, QueryResult } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

/**
 * PostgreSQL Connection Pool
 * Singleton pattern - one pool for the entire application
 */
class Database {
  private static instance: Database;
  private pool: Pool;

  private constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'trustless_granary',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      max: 20, // Maximum connections in pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      console.error('Unexpected database error:', err);
      process.exit(-1);
    });

    this.pool.on('connect', () => {
      console.log('✅ Database connection established');
    });
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public getPool(): Pool {
    return this.pool;
  }

  public async query(text: string, params?: unknown[]): Promise<QueryResult> {
    const start = Date.now();
    const result = await this.pool.query(text, params);
    const duration = Date.now() - start;
    
    if (duration > 1000) {
      console.warn(`⚠️ Slow query (${duration}ms):`, text);
    }
    
    return result;
  }

  public async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  public async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async close(): Promise<void> {
    await this.pool.end();
    console.log('Database pool closed');
  }
}

export default Database.getInstance();
