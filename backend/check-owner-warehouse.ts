import db from './src/config/database';

(async () => {
  const result = await db.query(
    `SELECT u.id, u.name, u.phone, u.warehouse_id, u.role, w.name as warehouse_name, w.owner_id
     FROM users u
     LEFT JOIN warehouses w ON u.warehouse_id = w.id
     WHERE u.phone = $1`,
    ['0244067853']
  );
  
  console.log('User:', result.rows[0]);
  
  if (result.rows[0]?.warehouse_id) {
    const warehouse = await db.query(
      'SELECT * FROM warehouses WHERE id = $1',
      [result.rows[0].warehouse_id]
    );
    console.log('Warehouse:', warehouse.rows[0]);
  }
  
  process.exit(0);
})();
