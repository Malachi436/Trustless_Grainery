const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'trustless_granary',
  password: 'postgres123',
  port: 5432,
});

async function checkBatches() {
  try {
    const result = await pool.query(`
      SELECT 
        id, 
        batch_code, 
        crop_type, 
        source_type,
        initial_bags,
        remaining_bags,
        created_at,
        CASE 
          WHEN qr_code_data IS NOT NULL THEN 'YES'
          ELSE 'NO'
        END as has_qr
      FROM batches 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log('\n📦 Recent Batches:');
    console.log('==================\n');
    
    if (result.rows.length === 0) {
      console.log('❌ No batches found in database!');
    } else {
      result.rows.forEach((batch, idx) => {
        console.log(`${idx + 1}. Batch Code: ${batch.batch_code || 'NULL'}`);
        console.log(`   Crop: ${batch.crop_type}`);
        console.log(`   Source: ${batch.source_type}`);
        console.log(`   Bags: ${batch.initial_bags}`);
        console.log(`   Has QR: ${batch.has_qr}`);
        console.log(`   Created: ${batch.created_at}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkBatches();
