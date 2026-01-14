import db from './src/config/database';

async function checkOwnerCredentials() {
  try {
    console.log('🔍 Checking owner credentials...\n');

    const result = await db.query(`
      SELECT u.id, u.name, u.phone, u.role, u.warehouse_id, w.name as warehouse_name
      FROM users u
      LEFT JOIN warehouses w ON u.warehouse_id = w.id
      WHERE u.role = 'OWNER'
      ORDER BY u.created_at
    `);

    if (result.rows.length === 0) {
      console.log('❌ No owners found in database');
      return;
    }

    console.log(`Found ${result.rows.length} owner(s):\n`);
    
    result.rows.forEach((owner, index) => {
      console.log(`Owner ${index + 1}:`);
      console.log(`  Name: ${owner.name}`);
      console.log(`  Phone: ${owner.phone}`);
      console.log(`  PIN: Check database directly (hashed)`);
      console.log(`  Warehouse: ${owner.warehouse_name || 'Not assigned'}`);
      console.log(`  Warehouse ID: ${owner.warehouse_id || 'N/A'}`);
      console.log('');
    });

    console.log('💡 Use these credentials to login as owner');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkOwnerCredentials();
