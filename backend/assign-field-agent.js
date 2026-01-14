const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'trustless_granary',
  password: 'postgres123',
  port: 5432,
});

async function assignFieldAgent() {
  try {
    // Get field agent user
    const fieldAgentResult = await pool.query(`
      SELECT id, name, phone, warehouse_id FROM users WHERE role = 'FIELD_AGENT' LIMIT 1
    `);
    
    if (fieldAgentResult.rows.length === 0) {
      console.log('❌ No field agent user found');
      return;
    }
    
    const fieldAgent = fieldAgentResult.rows[0];
    console.log(`\n✅ Found field agent user: ${fieldAgent.name} (${fieldAgent.id})`);
    console.log(`   Warehouse ID: ${fieldAgent.warehouse_id}`);
    
    // Create field agent record if doesn't exist
    await pool.query(`
      INSERT INTO field_agents (id, name, phone, community, status, created_by)
      VALUES ($1, $2, $3, 'N/A', 'ACTIVE', $1)
      ON CONFLICT (id) DO NOTHING
    `, [fieldAgent.id, fieldAgent.name, fieldAgent.phone]);
    
    console.log('✅ Field agent record created/verified');
    
    // Assign to warehouse
    await pool.query(`
      INSERT INTO warehouse_field_agents (warehouse_id, field_agent_id, assigned_by)
      VALUES ($1, $2, $2)
      ON CONFLICT (warehouse_id, field_agent_id) DO NOTHING
    `, [fieldAgent.warehouse_id, fieldAgent.id]);
    
    console.log('✅ Field agent assigned to warehouse successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

assignFieldAgent();
