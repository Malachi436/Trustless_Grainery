import db from './src/config/database';

(async () => {
  try {
    console.log('Adding unique constraint to transaction_projections...');
    
    // Add unique constraint on request_id
    await db.query(`
      ALTER TABLE transaction_projections 
      ADD CONSTRAINT transaction_projections_request_id_key 
      UNIQUE (request_id)
    `);
    
    console.log('✅ Unique constraint added successfully!');
    process.exit(0);
  } catch (error: any) {
    if (error.code === '42P07') {
      console.log('✅ Constraint already exists, skipping...');
      process.exit(0);
    }
    console.error('❌ Failed:', error.message);
    process.exit(1);
  }
})();
