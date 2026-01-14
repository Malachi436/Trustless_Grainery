const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'trustless_granary',
  password: 'postgres123',
  port: 5432
});

async function testTimezoneConversion() {
  try {
    console.log('\n=== Understanding Timezone Conversion ===');
    const result = await pool.query(`
      SELECT 
        created_at,
        created_at AT TIME ZONE 'UTC' as utc_explicit,
        created_at AT TIME ZONE 'Africa/Lagos' as lagos_time,
        (created_at AT TIME ZONE 'Africa/Lagos')::date as lagos_date,
        created_at::date as default_date,
        CURRENT_DATE,
        (created_at AT TIME ZONE 'Africa/Lagos')::date = CURRENT_DATE as is_today
      FROM events 
      WHERE event_type='DISPATCH_EXECUTED' 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    console.table(result.rows);
    
    console.log('\n=== Count with Timezone Conversion ===');
    const count = await pool.query(`
      SELECT 
        COUNT(CASE WHEN event_type = 'STOCK_INBOUND_RECORDED' THEN 1 END) as entries_logged,
        COUNT(CASE WHEN event_type = 'DISPATCH_EXECUTED' THEN 1 END) as dispatched
      FROM events
      WHERE (created_at AT TIME ZONE 'Africa/Lagos')::date = CURRENT_DATE
    `);
    console.table(count.rows);
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    pool.end();
  }
}

testTimezoneConversion();
