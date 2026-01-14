import db from '../config/database';

async function fixBatchSourceType() {
  try {
    console.log('Checking batch_source_type enum...');
    
    // Check existing values
    const result = await db.query(`
      SELECT unnest(enum_range(NULL::batch_source_type))::text as enum_value;
    `);
    
    console.log('Current enum values:', result.rows.map(r => r.enum_value));
    
    // Add OUTGROWER if not exists
    console.log('Adding OUTGROWER to batch_source_type enum...');
    await db.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type t 
          JOIN pg_enum e ON t.oid = e.enumtypid  
          WHERE t.typname = 'batch_source_type' AND e.enumlabel = 'OUTGROWER'
        ) THEN
          ALTER TYPE batch_source_type ADD VALUE 'OUTGROWER';
        END IF;
      END $$;
    `);
    
    console.log('✅ batch_source_type enum updated successfully!');
    
    // Verify
    const verifyResult = await db.query(`
      SELECT unnest(enum_range(NULL::batch_source_type))::text as enum_value;
    `);
    console.log('Updated enum values:', verifyResult.rows.map(r => r.enum_value));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixBatchSourceType();
