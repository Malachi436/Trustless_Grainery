const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'trustless_granary',
  password: 'postgres123',
  port: 5432
});

async function fixBatchInventory() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('\n=== Step 1: Check executed dispatches ===');
    const dispatches = await client.query(`
      SELECT request_id, crop, bag_quantity, status, executed_at
      FROM request_projections
      WHERE status = 'EXECUTED'
      ORDER BY executed_at DESC
    `);
    console.log(`Found ${dispatches.rows.length} executed dispatches`);
    console.table(dispatches.rows);
    
    console.log('\n=== Step 2: Check current batch inventory ===');
    const batchesBefore = await client.query(`
      SELECT id, batch_code, crop_type, initial_bags, remaining_bags
      FROM batches
      ORDER BY created_at ASC
    `);
    console.table(batchesBefore.rows);
    
    console.log('\n=== Step 3: Fix batch inventory by deducting dispatched amounts ===');
    
    for (const dispatch of dispatches.rows) {
      console.log(`\nProcessing dispatch ${dispatch.request_id}: ${dispatch.bag_quantity} bags of ${dispatch.crop}`);
      
      // Get batches for this crop (oldest first - FIFO)
      const batches = await client.query(`
        SELECT id, batch_code, remaining_bags
        FROM batches
        WHERE crop_type = $1 AND remaining_bags > 0
        ORDER BY created_at ASC
      `, [dispatch.crop]);
      
      let remainingToDeduct = dispatch.bag_quantity;
      
      for (const batch of batches.rows) {
        if (remainingToDeduct <= 0) break;
        
        const deductFromThisBatch = Math.min(batch.remaining_bags, remainingToDeduct);
        const newRemaining = batch.remaining_bags - deductFromThisBatch;
        
        await client.query(`
          UPDATE batches
          SET remaining_bags = $1
          WHERE id = $2
        `, [newRemaining, batch.id]);
        
        console.log(`  - Deducted ${deductFromThisBatch} bags from batch ${batch.batch_code} (${batch.remaining_bags} -> ${newRemaining})`);
        
        remainingToDeduct -= deductFromThisBatch;
      }
      
      if (remainingToDeduct > 0) {
        console.log(`  WARNING: Still need to deduct ${remainingToDeduct} bags but no batches available!`);
      }
    }
    
    console.log('\n=== Step 4: Check final batch inventory ===');
    const batchesAfter = await client.query(`
      SELECT id, batch_code, crop_type, initial_bags, remaining_bags
      FROM batches
      ORDER BY created_at ASC
    `);
    console.table(batchesAfter.rows);
    
    await client.query('COMMIT');
    console.log('\n✅ Batch inventory fixed successfully!');
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error fixing batch inventory:', err.message);
    throw err;
  } finally {
    client.release();
    pool.end();
  }
}

fixBatchInventory();
