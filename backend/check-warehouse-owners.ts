import db from './src/config/database';

(async () => {
  const userId = '89e0a5bc-0631-43ac-aa90-7caaccced6b6';
  const warehouseId = '013bb550-3419-45ea-9cb6-0e0a66392d93';
  
  // Check warehouse_owners table
  const owners = await db.query(
    'SELECT * FROM warehouse_owners WHERE warehouse_id = $1',
    [warehouseId]
  );
  console.log('Warehouse owners:', owners.rows);
  
  // Check function result
  const access = await db.query(
    'SELECT is_warehouse_owner($1, $2) AS has_access',
    [userId, warehouseId]
  );
  console.log('Has access:', access.rows[0]);
  
  // Check warehouse.owner_id
  const warehouse = await db.query(
    'SELECT owner_id FROM warehouses WHERE id = $1',
    [warehouseId]
  );
  console.log('Warehouse owner_id:', warehouse.rows[0]);
  
  process.exit(0);
})();
