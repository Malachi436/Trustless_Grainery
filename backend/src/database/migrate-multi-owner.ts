import { promises as fs } from 'fs';
import path from 'path';
import db from '../config/database';
import logger from '../config/logger';

/**
 * Migration Script for Multi-Owner Support & Analytics
 * Adds: warehouse_owners table, analytics projections, views
 * 
 * SAFETY: 100% backward-compatible
 * - Migrates existing owner_id to warehouse_owners
 * - All new tables/columns are additive
 * - No breaking changes to existing APIs
 */
async function runMigrationMultiOwner() {
  try {
    logger.info('🚀 Starting multi-owner & analytics migration...');

    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '002_add_multi_owner_and_analytics.sql');
    const migrationSql = await fs.readFile(migrationPath, 'utf-8');

    // Execute migration
    await db.query(migrationSql);

    logger.info('✅ Multi-owner & analytics migration completed successfully!');
    logger.info('📊 Changes applied:');
    logger.info('   ✓ Created warehouse_owners table (many-to-many)');
    logger.info('   ✓ Populated existing owner relationships');
    logger.info('   ✓ Created transaction_projections table');
    logger.info('   ✓ Created analytics views (outstanding_credit, batch_aging, attendant_activity)');
    logger.info('   ✓ Added security functions (is_warehouse_owner, get_owner_warehouses)');
    logger.info('');
    logger.info('🔒 Backward Compatibility: All existing data and APIs remain functional');
    logger.info('🎯 Multi-owner support: Warehouses can now have multiple owners with equal authority');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Multi-owner & analytics migration failed:', error);
    logger.error('');
    logger.error('Troubleshooting:');
    logger.error('  - Ensure v2 migration (batches, payment, tools) was run first');
    logger.error('  - Check database is running and accessible');
    logger.error('  - Verify .env credentials are correct');
    process.exit(1);
  }
}

runMigrationMultiOwner();
