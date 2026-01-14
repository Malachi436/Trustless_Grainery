import { readFileSync } from 'fs';
import { join } from 'path';
import db from '../config/database';

async function migrate() {
  try {
    console.log('🚀 Running migration 006: Add Maize Color and Upcoming Features...');

    const migrationSQL = readFileSync(
      join(__dirname, 'migrations', '006_add_maize_color_and_upcoming_features.sql'),
      'utf-8'
    );

    await db.query(migrationSQL);

    console.log('✅ Migration 006 completed successfully!');
    console.log('   - Added maize_color column to service_records');
    console.log('   - Created upcoming_recoveries view');
    console.log('   - Added performance index on expected_recovery_date');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
