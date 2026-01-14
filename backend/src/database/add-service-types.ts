import db from '../config/database';

async function addServiceTypes() {
  try {
    console.log('Adding HARROWING and RIDGING to service_type enum...');
    
    await db.query(`
      ALTER TYPE service_type ADD VALUE IF NOT EXISTS 'HARROWING';
      ALTER TYPE service_type ADD VALUE IF NOT EXISTS 'RIDGING';
    `);
    
    console.log('✅ Service types added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addServiceTypes();
