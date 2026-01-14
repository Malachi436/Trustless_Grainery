const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'trustless_granary',
  password: 'postgres123',
  port: 5432,
});

async function fixColumns() {
  try {
    await pool.query(`
      ALTER TABLE service_records 
      ADD COLUMN IF NOT EXISTS expected_recovery_date DATE,
      ADD COLUMN IF NOT EXISTS original_expected_date DATE,
      ADD COLUMN IF NOT EXISTS date_update_history JSONB DEFAULT '[]'
    `);
    
    console.log('✅ Columns added to service_records');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixColumns();
