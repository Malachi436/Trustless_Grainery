-- Migration 003: Add Batch QR Code System
-- Adds batch_code, qr_code_data, and warehouse_code to batches table
-- Adds batch source tracking fields

-- Add warehouse_code to warehouses table
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS warehouse_code VARCHAR(10) UNIQUE;

-- Add batch tracking columns
ALTER TABLE batches ADD COLUMN IF NOT EXISTS batch_code VARCHAR(50) UNIQUE;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS qr_code_data TEXT;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS warehouse_code VARCHAR(10);

-- Create index for batch_code lookups
CREATE INDEX IF NOT EXISTS idx_batches_code ON batches(batch_code);
CREATE INDEX IF NOT EXISTS idx_batches_warehouse_code ON batches(warehouse_code);

-- Add batch sequence tracking table
CREATE TABLE IF NOT EXISTS batch_sequences (
  id SERIAL PRIMARY KEY,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  crop_type crop_type NOT NULL,
  date DATE NOT NULL,
  last_sequence INTEGER NOT NULL DEFAULT 0,
  UNIQUE(warehouse_id, crop_type, date)
);

COMMENT ON TABLE batch_sequences IS 'Tracks daily batch sequence numbers per warehouse and crop type';

-- Create batch_scans table for QR scan verification during dispatch
CREATE TABLE IF NOT EXISTS batch_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES batches(id),
  request_id UUID NOT NULL REFERENCES request_projections(request_id),
  scanned_by UUID NOT NULL REFERENCES users(id),
  scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  bags_loaded INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_batch_scans_batch ON batch_scans(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_scans_request ON batch_scans(request_id);

COMMENT ON TABLE batch_scans IS 'Tracks QR code scans during dispatch execution for verification';

-- Update existing warehouses with default codes if they don't have one
DO $$
DECLARE
  counter INTEGER := 1;
  warehouse_record RECORD;
BEGIN
  FOR warehouse_record IN
    SELECT id FROM warehouses WHERE warehouse_code IS NULL ORDER BY created_at
  LOOP
    UPDATE warehouses
    SET warehouse_code = 'WH' || LPAD(counter::TEXT, 2, '0')
    WHERE id = warehouse_record.id;
    counter := counter + 1;
  END LOOP;
END $$;

-- Function to generate next batch code
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

COMMENT ON FUNCTION generate_batch_code IS 'Generates unique batch code: {CROP}-{YYYYMMDD}-{WAREHOUSE_CODE}-{SEQUENCE}';
