import { readFileSync } from 'fs';
import { join } from 'path';
import db from './src/config/database';

async function runMigration() {
  try {
    console.log('Running transaction sync trigger migration...');
    
    const sql = readFileSync(
      join(__dirname, 'src', 'database', 'migrations', '004_add_transaction_sync_trigger.sql'),
      'utf-8'
    );
    
    await db.query(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('Transaction projections trigger is now active.');
    
    // Verify
    const result = await db.query('SELECT COUNT(*) as count FROM transaction_projections');
    console.log(`Total transactions in projection: ${result.rows[0].count}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
