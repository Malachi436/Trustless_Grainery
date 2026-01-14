const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'trustless_granary',
  password: 'postgres123',
  port: 5432
});

async function checkTodayStats() {
  try {
    console.log('\n=== Check Database Timezone and Current Date ===');
    const dbTime = await pool.query(`
      SELECT 
        CURRENT_DATE,
        CURRENT_TIMESTAMP,
        timezone('UTC', CURRENT_TIMESTAMP) as utc_time,
        now() as now
    `);
    console.table(dbTime.rows);
    
    console.log('\n=== All DISPATCH_EXECUTED Events ===');
    const allDispatches = await pool.query(`
      SELECT 
        event_id,
        event_type,
        created_at,
        DATE(created_at) as event_date,
        DATE(created_at) = CURRENT_DATE as is_today,
        CURRENT_DATE as db_current_date
      FROM events 
      WHERE event_type = 'DISPATCH_EXECUTED'
      ORDER BY created_at DESC
    `);
    console.table(allDispatches.rows);
    
    console.log('\n=== Count of Today Events ===');
    const todayCount = await pool.query(`
      SELECT 
        COUNT(CASE WHEN event_type = 'STOCK_INBOUND_RECORDED' THEN 1 END) as entries_logged,
        COUNT(CASE WHEN event_type = 'DISPATCH_EXECUTED' THEN 1 END) as dispatched
      FROM events
      WHERE DATE(created_at) = CURRENT_DATE
    `);
    console.table(todayCount.rows);
    
    console.log('\n=== With Warehouse and Actor Filter (like API) ===');
    // Get first warehouse and attendant
    const warehouse = await pool.query('SELECT id FROM warehouses LIMIT 1');
    const attendant = await pool.query("SELECT id FROM users WHERE role = 'ATTENDANT' LIMIT 1");
    
    if (warehouse.rows.length > 0 && attendant.rows.length > 0) {
      const warehouseId = warehouse.rows[0].id;
      const attendantId = attendant.rows[0].id;
      
      console.log(`Warehouse: ${warehouseId}, Attendant: ${attendantId}`);
      
      const filteredCount = await pool.query(`
        SELECT 
          COUNT(CASE WHEN event_type = 'STOCK_INBOUND_RECORDED' THEN 1 END) as entries_logged,
          COUNT(CASE WHEN event_type = 'DISPATCH_EXECUTED' THEN 1 END) as dispatched
        FROM events
        WHERE warehouse_id = $1
          AND actor_id = $2
          AND DATE(created_at) = CURRENT_DATE
      `, [warehouseId, attendantId]);
      console.table(filteredCount.rows);
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    pool.end();
  }
}

checkTodayStats();
