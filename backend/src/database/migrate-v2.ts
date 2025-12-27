import { promises as fs } from 'fs';
import path from 'path';
import db from '../config/database';
import logger from '../config/logger';

/**
 * Migration Script for v2 Features
 * Adds: Batches, Payment Tracking, Tool Register
 * 
 * SAFETY: All changes are backward-compatible
 * - New event types added to enum
 * - New tables created
 * - New columns added with NULL defaults
 */
async function runMigrationV2() {
  try {
    logger.info('🚀 Starting v2 migration (Batches, Payment, Tools)...');

    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '001_add_batch_payment_tool_features.sql');
    const migrationSql = await fs.readFile(migrationPath, 'utf-8');

    // Execute migration
    await db.query(migrationSql);

    logger.info('✅ v2 Migration completed successfully!');
    logger.info('📊 Changes applied:');
    logger.info('   ✓ Extended event_type enum (3 new events)');
    logger.info('   ✓ Created 5 new enums (batch_source_type, buyer_type, etc.)');
    logger.info('   ✓ Created batches table');
    logger.info('   ✓ Created tools table');
    logger.info('   ✓ Created batch_allocations table');
    logger.info('   ✓ Extended request_projections (6 new columns)');
    logger.info('');
    logger.info('🔒 Backward Compatibility: All existing data remains valid');

    process.exit(0);
  } catch (error) {
    logger.error('❌ v2 Migration failed:', error);
    logger.error('');
    logger.error('Troubleshooting:');
    logger.error('  - Ensure database is running');
    logger.error('  - Check .env for correct credentials');
    logger.error('  - Verify initial schema was applied first');
    process.exit(1);
  }
}

runMigrationV2();
