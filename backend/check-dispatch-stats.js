const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'trustless_granary',
  password: 'postgres123',
  port: 5432
});

async function checkStats() {
  try {
    console.log('\n=== Recent Dispatches ===');
    const dispatches = await pool.query(`
      SELECT request_id, crop, bag_quantity, status, 
             TO_CHAR(executed_at, 'YYYY-MM-DD HH24:MI:SS') as executed_at
      FROM request_projections
      WHERE status = 'EXECUTED'
      ORDER BY executed_at DESC
      LIMIT 5
    `);
    console.table(dispatches.rows);
    
    console.log('\n=== Batch Inventory ===');
    const batches = await pool.query(`
      SELECT batch_code, crop_type, initial_bags, remaining_bags,
             TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
      FROM batches
      ORDER BY created_at DESC
      LIMIT 5
    `);
    console.table(batches.rows);
    
    console.log('\n=== Todays Events ===');
    const todayEvents = await pool.query(`
      SELECT event_type, COUNT(*) as count
      FROM events
      WHERE DATE(created_at) = CURRENT_DATE
      GROUP BY event_type
      ORDER BY count DESC
    `);
    console.table(todayEvents.rows);
    
    console.log('\n=== Database Current Date ===');
    const dbDate = await pool.query('SELECT CURRENT_DATE, CURRENT_TIMESTAMP');
    console.table(dbDate.rows);
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    pool.end();
  }
}

checkStats();
