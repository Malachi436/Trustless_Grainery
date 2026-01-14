const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'trustless_granary',
  password: 'postgres123',
  port: 5432
});

async function deleteWarehouse() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get warehouse ID
    const warehouse = await client.query('SELECT id, name FROM warehouses LIMIT 1');
    if (warehouse.rows.length === 0) {
      console.log('No warehouse found to delete');
      return;
    }
    
    const warehouseId = warehouse.rows[0].id;
    const warehouseName = warehouse.rows[0].name;
    
    console.log(`\n🗑️  Deleting warehouse: ${warehouseName} (${warehouseId})\n`);
    
    // Step 1: Delete from batch_sequences (CRITICAL - must be first!)
    console.log('Step 1: Deleting batch sequences...');
    const seqResult = await client.query('DELETE FROM batch_sequences WHERE warehouse_id = $1', [warehouseId]);
    console.log(`✅ Deleted ${seqResult.rowCount} batch sequence(s)`);
    
    // Step 2: Delete batch allocations
    console.log('Step 2: Deleting batch allocations...');
    const allocResult = await client.query(`
      DELETE FROM batch_allocations 
      WHERE request_id IN (
        SELECT request_id FROM request_projections WHERE warehouse_id = $1
      )
    `, [warehouseId]);
    console.log(`✅ Deleted ${allocResult.rowCount} batch allocation(s)`);
    
    // Step 3: Delete batch scans
    console.log('Step 3: Deleting batch scans...');
    const scanResult = await client.query('DELETE FROM batch_scans WHERE batch_id IN (SELECT id FROM batches WHERE warehouse_id = $1)', [warehouseId]);
    console.log(`✅ Deleted ${scanResult.rowCount} batch scan(s)`);
    
    // Step 4: Delete batches
    console.log('Step 4: Deleting batches...');
    const batchResult = await client.query('DELETE FROM batches WHERE warehouse_id = $1', [warehouseId]);
    console.log(`✅ Deleted ${batchResult.rowCount} batch(es)`);
    
    // Step 5: Delete request projections
    console.log('Step 5: Deleting request projections...');
    const reqResult = await client.query('DELETE FROM request_projections WHERE warehouse_id = $1', [warehouseId]);
    console.log(`✅ Deleted ${reqResult.rowCount} request projection(s)`);
    
    // Step 6: Delete stock projections
    console.log('Step 6: Deleting stock projections...');
    const stockResult = await client.query('DELETE FROM stock_projections WHERE warehouse_id = $1', [warehouseId]);
    console.log(`✅ Deleted ${stockResult.rowCount} stock projection(s)`);
    
    // Step 7: Delete events
    console.log('Step 7: Deleting events...');
    const eventResult = await client.query('DELETE FROM events WHERE warehouse_id = $1', [warehouseId]);
    console.log(`✅ Deleted ${eventResult.rowCount} event(s)`);
    
    // Step 8: Delete warehouse relationships
    console.log('Step 8: Deleting warehouse relationships...');
    await client.query('DELETE FROM attendant_warehouses WHERE warehouse_id = $1', [warehouseId]);
    await client.query('DELETE FROM warehouse_field_agents WHERE warehouse_id = $1', [warehouseId]);
    await client.query('DELETE FROM warehouse_owners WHERE warehouse_id = $1', [warehouseId]);
    console.log(`✅ Deleted warehouse relationships`);
    
    // Step 9: Delete farmers and service records
    console.log('Step 9: Deleting farmers and service records...');
    await client.query('DELETE FROM service_records WHERE warehouse_id = $1', [warehouseId]);
    await client.query('DELETE FROM farmers WHERE warehouse_id = $1', [warehouseId]);
    console.log(`✅ Deleted farmers and service records`);
    
    // Step 10: Finally delete the warehouse
    console.log('Step 10: Deleting warehouse...');
    const whResult = await client.query('DELETE FROM warehouses WHERE id = $1', [warehouseId]);
    console.log(`✅ Deleted warehouse`);
    
    await client.query('COMMIT');
    console.log(`\n✅ Successfully deleted warehouse "${warehouseName}" and all related data!\n`);
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error deleting warehouse:', err.message);
    throw err;
  } finally {
    client.release();
    pool.end();
  }
}

deleteWarehouse();
