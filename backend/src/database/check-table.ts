import db from '../config/database';

async function checkTable() {
  try {
    console.log('Checking for recovery_date_updates table...');
    
    const result = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'recovery_date_updates'
      );
    `);
    
    console.log('Table exists:', result.rows[0].exists);
    
    if (!result.rows[0].exists) {
      console.log('Creating recovery_date_updates table...');
      await db.query(`
        CREATE TABLE recovery_date_updates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          service_record_id UUID NOT NULL,
          farmer_id UUID NOT NULL,
          field_agent_id UUID NOT NULL,
          warehouse_id UUID NOT NULL,
          old_date DATE NOT NULL,
          new_date DATE NOT NULL,
          reason TEXT NOT NULL,
          updated_by UUID NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (service_record_id) REFERENCES service_records(id) ON DELETE CASCADE,
          FOREIGN KEY (farmer_id) REFERENCES farmers(id) ON DELETE CASCADE,
          FOREIGN KEY (field_agent_id) REFERENCES field_agents(id) ON DELETE CASCADE,
          FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
          FOREIGN KEY (updated_by) REFERENCES users(id)
        );
        
        CREATE INDEX idx_recovery_date_updates_service ON recovery_date_updates(service_record_id);
        CREATE INDEX idx_recovery_date_updates_farmer ON recovery_date_updates(farmer_id);
        CREATE INDEX idx_recovery_date_updates_date ON recovery_date_updates(created_at);
      `);
      console.log('✅ Table created successfully!');
    } else {
      console.log('✅ Table already exists');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkTable();
