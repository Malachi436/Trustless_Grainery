-- ============================================
-- MIGRATION: Multi-Owner Warehouse Support + Analytics
-- Date: 2025-12-27
-- Backward Compatible: YES
-- Safe to run on existing data: YES
-- ============================================

-- ============================================
-- 1. MULTI-OWNER SUPPORT (Additive)
-- ============================================

-- Junction table for many-to-many warehouse-owner relationship
CREATE TABLE warehouse_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role_type user_role NOT NULL DEFAULT 'OWNER',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (warehouse_id, user_id),
  CHECK (role_type = 'OWNER')
);

CREATE INDEX idx_warehouse_owners_warehouse ON warehouse_owners(warehouse_id);
CREATE INDEX idx_warehouse_owners_user ON warehouse_owners(user_id);

COMMENT ON TABLE warehouse_owners IS 'Many-to-many: Multiple owners can be assigned to a single warehouse. All owners have equal read and approval authority.';

-- ============================================
-- 2. POPULATE EXISTING DATA (Safe Backfill)
-- ============================================

-- Migrate existing single-owner relationships to new junction table
INSERT INTO warehouse_owners (warehouse_id, user_id, role_type)
SELECT id, owner_id, 'OWNER'::user_role
FROM warehouses
WHERE owner_id IS NOT NULL
ON CONFLICT (warehouse_id, user_id) DO NOTHING;

-- Keep warehouses.owner_id for backward compatibility
-- DO NOT DROP - existing code may reference it
-- New code should use warehouse_owners table

COMMENT ON COLUMN warehouses.owner_id IS 'DEPRECATED: Use warehouse_owners table instead. Kept for backward compatibility only.';

-- ============================================
-- 3. ANALYTICS PROJECTION TABLES (Derived)
-- These are READ MODELS only - rebuildable from events
-- ============================================

-- Transaction summary (derived from outbound workflow events)
CREATE TABLE transaction_projections (
  transaction_id UUID PRIMARY KEY,
  warehouse_id UUID NOT NULL,
  request_id UUID NOT NULL,
  
  -- Basic transaction info
  crop crop_type NOT NULL,
  bag_quantity INTEGER NOT NULL,
  transaction_date TIMESTAMP NOT NULL,
  
  -- Buyer info
  buyer_type buyer_type NULL,
  buyer_name VARCHAR(255) NULL,
  buyer_phone VARCHAR(20) NULL,
  
  -- Commercial details
  payment_method payment_method NULL,
  payment_status payment_status NULL,
  price_per_bag NUMERIC(10, 2) NULL,
  total_amount NUMERIC(12, 2) NULL,
  
  -- Actors
  requested_by UUID NOT NULL,
  approved_by UUID NULL,
  executed_by UUID NULL,
  payment_confirmed_by UUID NULL,
  
  -- Timestamps
  requested_at TIMESTAMP NOT NULL,
  approved_at TIMESTAMP NULL,
  executed_at TIMESTAMP NULL,
  payment_confirmed_at TIMESTAMP NULL,
  
  -- Status tracking
  current_status request_status NOT NULL,
  
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (request_id) REFERENCES request_projections(request_id),
  FOREIGN KEY (requested_by) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id),
  FOREIGN KEY (executed_by) REFERENCES users(id),
  FOREIGN KEY (payment_confirmed_by) REFERENCES users(id)
);

CREATE INDEX idx_transaction_projections_warehouse ON transaction_projections(warehouse_id);
CREATE INDEX idx_transaction_projections_request ON transaction_projections(request_id);
CREATE INDEX idx_transaction_projections_date ON transaction_projections(transaction_date DESC);
CREATE INDEX idx_transaction_projections_status ON transaction_projections(current_status);
CREATE INDEX idx_transaction_projections_buyer_type ON transaction_projections(buyer_type);
CREATE INDEX idx_transaction_projections_payment_status ON transaction_projections(payment_status);

COMMENT ON TABLE transaction_projections IS 'Analytics projection: Consolidated view of all outbound transactions. Derived from events, rebuildable.';

-- ============================================
-- 4. ANALYTICS HELPER VIEWS (Read-Only)
-- ============================================

-- Outstanding credit view
CREATE VIEW outstanding_credit AS
SELECT 
  tp.transaction_id,
  tp.warehouse_id,
  tp.buyer_name,
  tp.buyer_phone,
  tp.crop,
  tp.bag_quantity,
  tp.total_amount,
  tp.approved_at,
  tp.executed_at,
  EXTRACT(DAY FROM (CURRENT_TIMESTAMP - tp.executed_at)) AS days_outstanding,
  approver.name AS approved_by_name,
  executor.name AS executed_by_name
FROM transaction_projections tp
LEFT JOIN users approver ON tp.approved_by = approver.id
LEFT JOIN users executor ON tp.executed_by = executor.id
WHERE tp.payment_method = 'CREDIT'
  AND tp.payment_status = 'PENDING'
  AND tp.current_status = 'EXECUTED'
ORDER BY tp.executed_at ASC;

COMMENT ON VIEW outstanding_credit IS 'Analytics view: All credit transactions awaiting payment confirmation.';

-- Batch aging view
CREATE VIEW batch_aging AS
SELECT 
  b.id AS batch_id,
  b.warehouse_id,
  b.crop_type,
  b.source_type,
  b.source_name,
  b.initial_bags,
  b.remaining_bags,
  b.created_at AS batch_date,
  EXTRACT(DAY FROM (CURRENT_TIMESTAMP - b.created_at)) AS days_old,
  CASE 
    WHEN b.remaining_bags = 0 THEN 'SOLD_OUT'
    WHEN b.remaining_bags < (b.initial_bags * 0.25) THEN 'LOW_STOCK'
    WHEN EXTRACT(DAY FROM (CURRENT_TIMESTAMP - b.created_at)) > 90 THEN 'AGING'
    ELSE 'ACTIVE'
  END AS batch_status
FROM batches b
ORDER BY b.created_at ASC;

COMMENT ON VIEW batch_aging IS 'Analytics view: Batch rotation insights with aging indicators.';

-- Attendant activity summary
CREATE VIEW attendant_activity AS
SELECT 
  u.id AS attendant_id,
  u.name AS attendant_name,
  u.warehouse_id,
  COUNT(DISTINCT CASE WHEN tp.requested_by = u.id THEN tp.request_id END) AS requests_submitted,
  COUNT(DISTINCT CASE WHEN tp.executed_by = u.id THEN tp.request_id END) AS dispatches_executed,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'ASSIGNED' AND t.assigned_to_attendant_id = u.id) AS tools_currently_assigned,
  AVG(EXTRACT(EPOCH FROM (tp.executed_at - tp.approved_at)) / 3600) FILTER (WHERE tp.executed_at IS NOT NULL AND tp.approved_at IS NOT NULL) AS avg_hours_approval_to_execution
FROM users u
LEFT JOIN transaction_projections tp ON (tp.requested_by = u.id OR tp.executed_by = u.id)
LEFT JOIN tools t ON t.assigned_to_attendant_id = u.id
WHERE u.role = 'ATTENDANT'
GROUP BY u.id, u.name, u.warehouse_id;

COMMENT ON VIEW attendant_activity IS 'Analytics view: Activity summary per attendant. Informational only, no scoring.';

-- ============================================
-- 5. SECURITY FUNCTIONS (Multi-Owner Safe)
-- ============================================

-- Check if a user is an owner of a warehouse
CREATE OR REPLACE FUNCTION is_warehouse_owner(p_user_id UUID, p_warehouse_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM warehouse_owners 
    WHERE user_id = p_user_id 
    AND warehouse_id = p_warehouse_id
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION is_warehouse_owner IS 'Security helper: Check if user is an owner of the warehouse. Multi-owner safe.';

-- Get all warehouses for an owner
CREATE OR REPLACE FUNCTION get_owner_warehouses(p_user_id UUID)
RETURNS TABLE (
  warehouse_id UUID,
  warehouse_name VARCHAR(255),
  warehouse_location VARCHAR(500),
  warehouse_status warehouse_status
) AS $$
BEGIN
  RETURN QUERY
  SELECT w.id, w.name, w.location, w.status
  FROM warehouses w
  INNER JOIN warehouse_owners wo ON wo.warehouse_id = w.id
  WHERE wo.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_owner_warehouses IS 'Security helper: Get all warehouses assigned to an owner.';

-- ============================================
-- 6. EXTEND REQUEST PROJECTIONS (Track Approver)
-- ============================================

-- NO CHANGES NEEDED - approved_by already exists
-- Just ensure it's being populated correctly in application logic

-- ============================================
-- 7. INITIAL DATA POPULATION (Safe)
-- ============================================

-- Populate transaction_projections from existing request_projections
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
ON CONFLICT (transaction_id) DO NOTHING;

-- ============================================
-- 8. SAFE DEFAULTS & BACKWARD COMPATIBILITY
-- ============================================

-- All new tables are additive
-- All new columns have NULL defaults
-- Existing queries continue to work
-- warehouse_owners is populated from existing data
-- No breaking changes

-- ============================================
-- VERIFICATION QUERIES (Run after migration)
-- ============================================

-- Verify multi-owner setup
-- SELECT w.name, COUNT(wo.user_id) as owner_count
-- FROM warehouses w
-- LEFT JOIN warehouse_owners wo ON wo.warehouse_id = w.id
-- GROUP BY w.id, w.name;

-- Verify transaction projections populated
-- SELECT COUNT(*) FROM transaction_projections;

-- Verify outstanding credit view
-- SELECT * FROM outstanding_credit LIMIT 5;
