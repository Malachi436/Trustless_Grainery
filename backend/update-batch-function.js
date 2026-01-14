const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'trustless_granary',
  password: process.env.DB_PASSWORD || 'postgres123',
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function updateBatchFunction() {
  const client = await pool.connect();
  try {
    console.log('Updating generate_batch_code function...');
    
    await client.query(`
      CREATE OR REPLACE FUNCTION generate_batch_code(
        p_warehouse_id UUID,
        p_crop_type crop_type,
        p_date DATE DEFAULT CURRENT_DATE
      )
      RETURNS VARCHAR(50) AS $$
      DECLARE
        v_warehouse_code VARCHAR(10);
        v_sequence INTEGER;
        v_batch_code VARCHAR(50);
      BEGIN
        -- Get warehouse code
        SELECT warehouse_code INTO v_warehouse_code
        FROM warehouses
        WHERE id = p_warehouse_id;

        IF v_warehouse_code IS NULL THEN
          RAISE EXCEPTION 'Warehouse code not found for warehouse_id: %', p_warehouse_id;
        END IF;

        -- Get or increment sequence
        INSERT INTO batch_sequences (warehouse_id, crop_type, date, last_sequence)
        VALUES (p_warehouse_id, p_crop_type, p_date, 1)
        ON CONFLICT (warehouse_id, crop_type, date)
        DO UPDATE SET last_sequence = batch_sequences.last_sequence + 1
        RETURNING last_sequence INTO v_sequence;

        -- Format: {CROP}-{YYYYMMDD}-{WAREHOUSE_CODE}-{SEQUENCE}
        v_batch_code := UPPER(p_crop_type::TEXT) || '-' || 
                        TO_CHAR(p_date, 'YYYYMMDD') || '-' || 
                        v_warehouse_code || '-' || 
                        LPAD(v_sequence::TEXT, 3, '0');

        RETURN v_batch_code;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    console.log('✅ Function updated successfully!');
  } catch (error) {
    console.error('❌ Error updating function:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

updateBatchFunction();
