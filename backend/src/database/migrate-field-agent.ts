import { promises as fs } from 'fs';
import path from 'path';
import db from '../config/database';
import logger from '../config/logger';

/**
 * Migration Script for Field Agent & Outgrower Support
 * Adds: Field agents, farmers, service records, recovery tracking
 * 
 * SAFETY: 100% backward-compatible
 * - All new tables are additive
 * - Existing batch and event tables extended with nullable fields
 * - No breaking changes to existing APIs
 */
async function runMigrationFieldAgent() {
  try {
    logger.info('🚀 Starting field agent & outgrower support migration...');

    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '003_add_field_agent_outgrower_support.sql');
    const migrationSql = await fs.readFile(migrationPath, 'utf-8');

    // Execute migration
    await db.query(migrationSql);

    logger.info('✅ Field agent & outgrower migration completed successfully!');
    logger.info('📊 Changes applied:');
    logger.info('   ✓ Created field_agents table');
    logger.info('   ✓ Created warehouse_field_agents mapping table');
    logger.info('   ✓ Created farmers table');
    logger.info('   ✓ Created service_records table');
    logger.info('   ✓ Created recovery_tracking table');
    logger.info('   ✓ Extended batches table with outgrower fields');
    logger.info('   ✓ Added 4 new event types');
    logger.info('   ✓ Created expected_inventory view');
    logger.info('   ✓ Added security functions');
    logger.info('   ✓ Created audit logging table');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrationFieldAgent();
