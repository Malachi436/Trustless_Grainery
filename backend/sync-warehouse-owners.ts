import db from './src/config/database';

(async () => {
  console.log('Syncing warehouse_owners table...');
  
  // Insert missing entries from warehouses.owner_id
  const result = await db.query(`
    INSERT INTO warehouse_owners (warehouse_id, user_id)
    SELECT w.id, w.owner_id
    FROM warehouses w
    WHERE w.owner_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM warehouse_owners wo
      WHERE wo.warehouse_id = w.id AND wo.user_id = w.owner_id
    )
    RETURNING *
  `);
  
  console.log(`✅ Added ${result.rowCount} entries to warehouse_owners`);
  console.log('Entries:', result.rows);
  
  process.exit(0);
})();
