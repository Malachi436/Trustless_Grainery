const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'trustless_granary',
  password: 'postgres123',
  port: 5432
});

async function debugUserFK() {
  try {
    // Get the field agent user that's failing to delete
    console.log('\n=== Field Agent Users ===');
    const users = await pool.query(`
      SELECT id, name, phone, role 
      FROM users 
      WHERE role = 'FIELD_AGENT'
      ORDER BY created_at DESC
    `);
    console.table(users.rows);
    
    if (users.rows.length > 0) {
      const userId = users.rows[0].id;
      console.log(`\n=== Checking FK references for user: ${userId} ===`);
      
      // Check field_agents table
      console.log('\n--- field_agents created_by ---');
      const fieldAgents = await pool.query(`
        SELECT id, name, phone, created_by, created_at
        FROM field_agents 
        WHERE created_by = $1
      `, [userId]);
      console.table(fieldAgents.rows);
      
      // Check farmers
      console.log('\n--- farmers created_by ---');
      const farmers = await pool.query(`
        SELECT id, name, phone, created_by
        FROM farmers 
        WHERE created_by = $1
      `, [userId]);
      console.table(farmers.rows);
      
      // Check warehouse_field_agents
      console.log('\n--- warehouse_field_agents assigned_by ---');
      const wfa = await pool.query(`
        SELECT id, warehouse_id, field_agent_id, assigned_by
        FROM warehouse_field_agents 
        WHERE assigned_by = $1
      `, [userId]);
      console.table(wfa.rows);
      
      // Check attendant_warehouses
      console.log('\n--- attendant_warehouses ---');
      const aw = await pool.query(`
        SELECT warehouse_id, attendant_id
        FROM attendant_warehouses 
        WHERE attendant_id = $1
      `, [userId]);
      console.table(aw.rows);
      
      // Check batch_scans
      console.log('\n--- batch_scans scanned_by ---');
      const scans = await pool.query(`
        SELECT id, batch_id, request_id, scanned_by
        FROM batch_scans 
        WHERE scanned_by = $1
      `, [userId]);
      console.table(scans.rows);
      
      // Check ALL field_agents (not just created_by)
      console.log('\n=== ALL field_agents records ===');
      const allFA = await pool.query(`SELECT id, name, phone, created_by FROM field_agents`);
      console.table(allFA.rows);
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    pool.end();
  }
}

debugUserFK();
