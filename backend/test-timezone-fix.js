const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'trustless_granary',
  password: 'postgres123',
  port: 5432
});

async function testTimezoneQuery() {
  try {
    console.log('\n=== Test created_at::date vs DATE(created_at) ===');
    const result = await pool.query(`
      SELECT 
        created_at,
        created_at::date as local_date,
        DATE(created_at) as utc_date,
        CURRENT_DATE,
        created_at::date = CURRENT_DATE as matches_today_local,
        DATE(created_at) = CURRENT_DATE as matches_today_utc
      FROM events 
      WHERE event_type='DISPATCH_EXECUTED' 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    console.table(result.rows);
    
    console.log('\n=== Count using created_at::date (FIXED) ===');
    const fixedCount = await pool.query(`
      SELECT 
        COUNT(CASE WHEN event_type = 'STOCK_INBOUND_RECORDED' THEN 1 END) as entries_logged,
        COUNT(CASE WHEN event_type = 'DISPATCH_EXECUTED' THEN 1 END) as dispatched
      FROM events
      WHERE created_at::date = CURRENT_DATE
    `);
    console.table(fixedCount.rows);
    
    console.log('\n=== Count using DATE(created_at) (OLD - BROKEN) ===');
    const brokenCount = await pool.query(`
      SELECT 
        COUNT(CASE WHEN event_type = 'STOCK_INBOUND_RECORDED' THEN 1 END) as entries_logged,
        COUNT(CASE WHEN event_type = 'DISPATCH_EXECUTED' THEN 1 END) as dispatched
      FROM events
      WHERE DATE(created_at) = CURRENT_DATE
    `);
    console.table(brokenCount.rows);
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    pool.end();
  }
}

testTimezoneQuery();
