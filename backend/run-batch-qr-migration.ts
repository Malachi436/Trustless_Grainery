import db from './src/config/database';
import * as fs from 'fs';
import * as path from 'path';

(async () => {
  try {
    console.log('Running migration: 003_add_batch_qr_system.sql...\n');

    const migrationPath = path.join(__dirname, 'src/database/migrations/003_add_batch_qr_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    await db.query(migrationSQL);

    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
})();
