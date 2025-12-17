import { promises as fs } from 'fs';
import path from 'path';
import db from '../config/database';
import logger from '../config/logger';

async function runMigration() {
  try {
    logger.info('🚀 Starting database migration...');

    // Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = await fs.readFile(schemaPath, 'utf-8');

    // Execute schema
    await db.query(schemaSql);

    logger.info('✅ Database schema created successfully!');
    logger.info('📊 Tables created:');
    logger.info('   - users');
    logger.info('   - warehouses');
    logger.info('   - attendant_warehouses');
    logger.info('   - events (IMMUTABLE)');
    logger.info('   - request_projections');
    logger.info('   - stock_projections');
    logger.info('   - audit_log');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
