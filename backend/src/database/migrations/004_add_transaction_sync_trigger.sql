-- ============================================
-- Migration: Add trigger to sync transaction_projections
-- ============================================
-- This trigger ensures transaction_projections stays in sync
-- with request_projections for the owner dashboard analytics

-- Function to upsert transaction_projections
CREATE OR REPLACE FUNCTION sync_transaction_projections()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO transaction_projections (
    transaction_id,
    warehouse_id,
    request_id,
    crop,
    bag_quantity,
    transaction_date,
    buyer_type,
    buyer_name,
    buyer_phone,
    payment_method,
    payment_status,
    price_per_bag,
    total_amount,
    requested_by,
    approved_by,
    executed_by,
    payment_confirmed_by,
    requested_at,
    approved_at,
    executed_at,
    payment_confirmed_at,
    current_status
  )
  VALUES (
    gen_random_uuid(),
    NEW.warehouse_id,
    NEW.request_id,
    NEW.crop,
    NEW.bag_quantity,
    COALESCE(NEW.executed_at, NEW.approved_at, NEW.requested_at),
    NEW.buyer_type,
    NEW.buyer_name,
    COALESCE(NEW.buyer_phone_updated, NEW.buyer_phone),
    NEW.payment_method,
    NEW.payment_status,
    NEW.price_per_bag,
    NEW.total_amount,
    NEW.requested_by,
    NEW.approved_by,
    NEW.executed_by,
    NEW.payment_confirmed_by,
    NEW.requested_at,
    NEW.approved_at,
    NEW.executed_at,
    NEW.payment_confirmed_at,
    NEW.status
  )
  ON CONFLICT (request_id) 
  DO UPDATE SET
    crop = EXCLUDED.crop,
    bag_quantity = EXCLUDED.bag_quantity,
    transaction_date = EXCLUDED.transaction_date,
    buyer_type = EXCLUDED.buyer_type,
    buyer_name = EXCLUDED.buyer_name,
    buyer_phone = EXCLUDED.buyer_phone,
    payment_method = EXCLUDED.payment_method,
    payment_status = EXCLUDED.payment_status,
    price_per_bag = EXCLUDED.price_per_bag,
    total_amount = EXCLUDED.total_amount,
    approved_by = EXCLUDED.approved_by,
    executed_by = EXCLUDED.executed_by,
    payment_confirmed_by = EXCLUDED.payment_confirmed_by,
    approved_at = EXCLUDED.approved_at,
    executed_at = EXCLUDED.executed_at,
    payment_confirmed_at = EXCLUDED.payment_confirmed_at,
    current_status = EXCLUDED.current_status;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on request_projections
DROP TRIGGER IF EXISTS trigger_sync_transaction_projections ON request_projections;

CREATE TRIGGER trigger_sync_transaction_projections
AFTER INSERT OR UPDATE ON request_projections
FOR EACH ROW
EXECUTE FUNCTION sync_transaction_projections();

-- Backfill any missing transactions
INSERT INTO transaction_projections (
  transaction_id,
  warehouse_id,
  request_id,
  crop,
  bag_quantity,
  transaction_date,
  buyer_type,
  buyer_name,
  buyer_phone,
  payment_method,
  payment_status,
  price_per_bag,
  total_amount,
  requested_by,
  approved_by,
  executed_by,
  payment_confirmed_by,
  requested_at,
  approved_at,
  executed_at,
  payment_confirmed_at,
  current_status
)
SELECT 
  gen_random_uuid(),
  rp.warehouse_id,
  rp.request_id,
  rp.crop,
  rp.bag_quantity,
  COALESCE(rp.executed_at, rp.approved_at, rp.requested_at) AS transaction_date,
  rp.buyer_type,
  rp.buyer_name,
  COALESCE(rp.buyer_phone_updated, rp.buyer_phone) AS buyer_phone,
  rp.payment_method,
  rp.payment_status,
  rp.price_per_bag,
  rp.total_amount,
  rp.requested_by,
  rp.approved_by,
  rp.executed_by,
  rp.payment_confirmed_by,
  rp.requested_at,
  rp.approved_at,
  rp.executed_at,
  rp.payment_confirmed_at,
  rp.status
FROM request_projections rp
WHERE NOT EXISTS (
  SELECT 1 FROM transaction_projections tp
  WHERE tp.request_id = rp.request_id
);
