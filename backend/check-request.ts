import db from './src/config/database';

(async () => {
  const result = await db.query(
    'SELECT * FROM request_projections WHERE request_id = $1',
    ['c29fa150-e8c3-472a-a32d-630b48ea816c']
  );
  console.log(JSON.stringify(result.rows[0], null, 2));
  process.exit(0);
})();
