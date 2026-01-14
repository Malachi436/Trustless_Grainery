import db from './src/config/database';

/**
 * Sync attendant_warehouses table
 * Populate from users table where role = ATTENDANT
 */
async function syncAttendantWarehouses() {
  try {
    console.log('🔄 Syncing attendant_warehouses table...\n');

    // Check current state
    const currentResult = await db.query('SELECT * FROM attendant_warehouses');
    console.log(`Current attendant_warehouses entries: ${currentResult.rows.length}`);
    
    if (currentResult.rows.length > 0) {
      console.log('Existing entries:');
      currentResult.rows.forEach(row => {
        console.log(`  - Attendant: ${row.attendant_id}, Warehouse: ${row.warehouse_id}`);
      });
      console.log('');
    }

    // Find all attendants with warehouse assignments
    const attendantsResult = await db.query(`
      SELECT id as attendant_id, warehouse_id, name, phone
      FROM users 
      WHERE role = 'ATTENDANT' AND warehouse_id IS NOT NULL
    `);

    console.log(`Found ${attendantsResult.rows.length} attendants with warehouse assignments`);
    
    if (attendantsResult.rows.length === 0) {
      console.log('⚠️  No attendants found with warehouse assignments');
      return;
    }

    // Insert missing entries
    let inserted = 0;
    for (const attendant of attendantsResult.rows) {
      const checkResult = await db.query(
        'SELECT 1 FROM attendant_warehouses WHERE attendant_id = $1 AND warehouse_id = $2',
        [attendant.attendant_id, attendant.warehouse_id]
      );

      if (checkResult.rows.length === 0) {
        await db.query(
          `INSERT INTO attendant_warehouses (attendant_id, warehouse_id) 
           VALUES ($1, $2)`,
          [attendant.attendant_id, attendant.warehouse_id]
        );
        console.log(`✅ Added: ${attendant.name} (${attendant.phone}) → Warehouse ${attendant.warehouse_id}`);
        inserted++;
      } else {
        console.log(`⏭️  Skipped: ${attendant.name} (already linked)`);
      }
    }

    console.log(`\n✅ Sync complete! Added ${inserted} new entries.`);

    // Verify final state
    const finalResult = await db.query('SELECT * FROM attendant_warehouses');
    console.log(`\nFinal attendant_warehouses entries: ${finalResult.rows.length}`);

  } catch (error) {
    console.error('❌ Sync failed:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

syncAttendantWarehouses();
