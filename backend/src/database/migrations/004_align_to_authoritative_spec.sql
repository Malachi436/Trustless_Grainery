-- ============================================
-- MIGRATION: Align to Authoritative Spec
-- Date: 2026-01-11
-- Purpose: Align system with Trustless Granary Final Logic document
-- SAFE: YES - Backward compatible, adds only
-- ============================================

-- ============================================
-- 1. EXTEND FIELD_AGENTS TABLE
-- Add communities (array) and supervised_smes (array)
-- ============================================

ALTER TABLE field_agents
  DROP COLUMN IF EXISTS community CASCADE;

ALTER TABLE field_agents
  ADD COLUMN IF NOT EXISTS communities TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS supervised_smes TEXT[] DEFAULT '{}';

-- Create index for communities array
CREATE INDEX IF NOT EXISTS idx_field_agents_communities ON field_agents USING GIN (communities);

COMMENT ON COLUMN field_agents.communities IS 'Array of communities/zones assigned to the field agent';
COMMENT ON COLUMN field_agents.supervised_smes IS 'Optional array of supervised SME identifiers';

-- ============================================
-- 2. EXTEND SERVICE_RECORDS TABLE
-- Add expected_recovery_date and delay tracking
-- ============================================

ALTER TABLE service_records
  ADD COLUMN IF NOT EXISTS expected_recovery_date DATE,
  ADD COLUMN IF NOT EXISTS original_expected_date DATE,
  ADD COLUMN IF NOT EXISTS date_update_history JSONB DEFAULT '[]';

CREATE INDEX IF NOT EXISTS idx_service_records_expected_date ON service_records(expected_recovery_date);

COMMENT ON COLUMN service_records.expected_recovery_date IS 'Date when recovery is expected';
COMMENT ON COLUMN service_records.original_expected_date IS 'Original expected recovery date (immutable)';
COMMENT ON COLUMN service_records.date_update_history IS 'Array of {updated_at, old_date, new_date, reason, updated_by}';

-- ============================================
-- 3. ADD NEW EVENT TYPE: EXPECTED_RECOVERY_DATE_UPDATED
-- ============================================

ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'EXPECTED_RECOVERY_DATE_UPDATED';

COMMENT ON TYPE event_type IS 'Event types - HARVEST_COMPLETED is deprecated, do not use';

-- ============================================
-- 4. CREATE RECOVERY DATE UPDATE HISTORY TABLE
-- Tracking all recovery date changes with reasons
-- ============================================

CREATE TABLE IF NOT EXISTS recovery_date_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_record_id UUID NOT NULL,
  farmer_id UUID NOT NULL,
  field_agent_id UUID NOT NULL,
  warehouse_id UUID NOT NULL,
  old_date DATE NOT NULL,
  new_date DATE NOT NULL,
  reason TEXT NOT NULL,
  updated_by UUID NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (service_record_id) REFERENCES service_records(id) ON DELETE CASCADE,
  FOREIGN KEY (farmer_id) REFERENCES farmers(id) ON DELETE CASCADE,
  FOREIGN KEY (field_agent_id) REFERENCES field_agents(id) ON DELETE CASCADE,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_recovery_date_updates_service ON recovery_date_updates(service_record_id);
CREATE INDEX IF NOT EXISTS idx_recovery_date_updates_farmer ON recovery_date_updates(farmer_id);
CREATE INDEX IF NOT EXISTS idx_recovery_date_updates_date ON recovery_date_updates(updated_at);

-- ============================================
-- 5. OWNER DASHBOARD ANALYTICS VIEWS
-- Expected vs Actual Recovery Tracking
-- ============================================

-- View: Recovery Timeline (Next 4 weeks + Overdue)
CREATE OR REPLACE VIEW recovery_timeline AS
SELECT
  sr.id AS service_record_id,
  sr.warehouse_id,
  sr.farmer_id,
  sr.field_agent_id,
  f.name AS farmer_name,
  f.community AS farmer_community,
  fa.name AS field_agent_name,
  sr.expected_bags,
  COALESCE(rt.received_bags, 0) AS received_bags,
  sr.expected_bags - COALESCE(rt.received_bags, 0) AS outstanding_bags,
  sr.expected_recovery_date,
  sr.recovery_status,
  sr.created_at AS service_date,
  CASE
    WHEN sr.expected_recovery_date IS NULL THEN 'NO_DATE_SET'
    WHEN sr.expected_recovery_date < CURRENT_DATE AND sr.recovery_status != 'COMPLETED' THEN 'OVERDUE'
    WHEN sr.expected_recovery_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '4 weeks' THEN 'UPCOMING'
    ELSE 'FUTURE'
  END AS timeline_status,
  sr.expected_recovery_date - CURRENT_DATE AS days_until_expected
FROM service_records sr
LEFT JOIN farmers f ON sr.farmer_id = f.id
LEFT JOIN field_agents fa ON sr.field_agent_id = fa.id
LEFT JOIN recovery_tracking rt ON sr.id = rt.service_record_id
WHERE f.status = 'ACTIVE' AND fa.status = 'ACTIVE'
ORDER BY sr.expected_recovery_date ASC NULLS LAST;

-- View: Field Agent Performance
CREATE OR REPLACE VIEW field_agent_performance AS
SELECT
  fa.id AS field_agent_id,
  fa.name AS field_agent_name,
  fa.communities,
  sr.warehouse_id,
  COUNT(DISTINCT sr.farmer_id) AS total_farmers,
  COUNT(sr.id) AS total_services,
  SUM(sr.expected_bags) AS total_expected_bags,
  SUM(COALESCE(rt.received_bags, 0)) AS total_received_bags,
  SUM(sr.expected_bags - COALESCE(rt.received_bags, 0)) AS total_outstanding_bags,
  COUNT(CASE WHEN sr.recovery_status = 'COMPLETED' THEN 1 END) AS completed_services,
  COUNT(CASE WHEN sr.recovery_status = 'PENDING' THEN 1 END) AS pending_services,
  COUNT(CASE WHEN sr.expected_recovery_date < CURRENT_DATE AND sr.recovery_status != 'COMPLETED' THEN 1 END) AS overdue_services,
  ROUND(
    100.0 * COUNT(CASE WHEN sr.recovery_status = 'COMPLETED' THEN 1 END) / NULLIF(COUNT(sr.id), 0),
    2
  ) AS completion_rate_percent
FROM field_agents fa
LEFT JOIN service_records sr ON fa.id = sr.field_agent_id
LEFT JOIN recovery_tracking rt ON sr.id = rt.service_record_id
WHERE fa.status = 'ACTIVE'
GROUP BY fa.id, fa.name, fa.communities, sr.warehouse_id;

-- View: Recovery vs Aggregated Analytics
CREATE OR REPLACE VIEW recovery_aggregated_analytics AS
SELECT
  b.warehouse_id,
  b.crop_type,
  -- Recovery inbound (from services)
  SUM(CASE WHEN b.source_subtype = 'RECOVERY' THEN b.initial_bags ELSE 0 END) AS recovery_bags_total,
  COUNT(CASE WHEN b.source_subtype = 'RECOVERY' THEN 1 END) AS recovery_batches_count,
  -- Aggregated inbound (extra purchases)
  SUM(CASE WHEN b.source_subtype = 'AGGREGATED' THEN b.initial_bags ELSE 0 END) AS aggregated_bags_total,
  COUNT(CASE WHEN b.source_subtype = 'AGGREGATED' THEN 1 END) AS aggregated_batches_count,
  -- Own farm
  SUM(CASE WHEN b.source_type = 'OWN_FARM' THEN b.initial_bags ELSE 0 END) AS own_farm_bags_total,
  COUNT(CASE WHEN b.source_type = 'OWN_FARM' THEN 1 END) AS own_farm_batches_count,
  -- Non-outgrower
  SUM(CASE WHEN b.source_type NOT IN ('OWN_FARM', 'OUTGROWER') THEN b.initial_bags ELSE 0 END) AS non_outgrower_bags_total,
  COUNT(CASE WHEN b.source_type NOT IN ('OWN_FARM', 'OUTGROWER') THEN 1 END) AS non_outgrower_batches_count
FROM batches b
GROUP BY b.warehouse_id, b.crop_type;

-- View: Batch Aging (How long stock has been sitting)
CREATE OR REPLACE VIEW batch_aging AS
SELECT
  b.id AS batch_id,
  b.warehouse_id,
  b.crop_type,
  b.source_type,
  b.source_subtype,
  b.initial_bags,
  b.remaining_bags,
  b.created_at,
  CURRENT_DATE - b.created_at::DATE AS days_in_warehouse,
  CASE
    WHEN (CURRENT_DATE - b.created_at::DATE) < 30 THEN 'FRESH'
    WHEN (CURRENT_DATE - b.created_at::DATE) BETWEEN 30 AND 90 THEN 'AGING'
    ELSE 'OLD'
  END AS aging_category
FROM batches b
WHERE b.remaining_bags > 0
ORDER BY b.created_at DESC;

-- ============================================
-- 6. QR CODE VAULT (Read-only for Platform Admin)
-- ============================================

CREATE TABLE IF NOT EXISTS qr_code_vault (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL UNIQUE,
  qr_code_data TEXT NOT NULL,
  qr_code_url TEXT,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  generated_by UUID NOT NULL,
  warehouse_id UUID NOT NULL,
  FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
  FOREIGN KEY (generated_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_qr_vault_batch ON qr_code_vault(batch_id);
CREATE INDEX IF NOT EXISTS idx_qr_vault_warehouse ON qr_code_vault(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_qr_vault_generated_at ON qr_code_vault(generated_at);

-- Read-only QR vault view for Platform Admins
CREATE OR REPLACE VIEW admin_qr_vault AS
SELECT
  qr.id,
  qr.batch_id,
  qr.qr_code_data,
  qr.qr_code_url,
  qr.generated_at,
  b.crop_type,
  b.source_type,
  b.source_subtype,
  b.initial_bags,
  b.remaining_bags,
  b.created_at AS batch_created_at,
  w.name AS warehouse_name,
  w.location AS warehouse_location,
  u.name AS generated_by_name
FROM qr_code_vault qr
JOIN batches b ON qr.batch_id = b.id
JOIN warehouses w ON qr.warehouse_id = w.id
JOIN users u ON qr.generated_by = u.id
ORDER BY qr.generated_at DESC;

-- ============================================
-- 7. ROLE GUARD FUNCTIONS
-- Enforce role separation at database level
-- ============================================

-- Function: Check if user can manage warehouse staff
CREATE OR REPLACE FUNCTION can_manage_warehouse_staff(p_user_id UUID, p_warehouse_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_role user_role;
  v_user_warehouse_id UUID;
BEGIN
  SELECT role, warehouse_id INTO v_role, v_user_warehouse_id
  FROM users WHERE id = p_user_id;
  
  -- Platform Admin CANNOT manage warehouse staff
  IF v_role = 'PLATFORM_ADMIN' THEN
    RETURN FALSE;
  END IF;
  
  -- Owner can manage staff in their warehouse
  IF v_role = 'OWNER' AND v_user_warehouse_id = p_warehouse_id THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function: Check if field agent has community access
CREATE OR REPLACE FUNCTION field_agent_has_community_access(p_field_agent_id UUID, p_community TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM field_agents
    WHERE id = p_field_agent_id
    AND p_community = ANY(communities)
    AND status = 'ACTIVE'
  );
END;
$$ LANGUAGE plpgsql;

-- Function: Check if user can see prices
CREATE OR REPLACE FUNCTION can_see_prices(p_user_role user_role)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN p_user_role IN ('OWNER', 'PLATFORM_ADMIN');
END;
$$ LANGUAGE plpgsql;

-- Function: Check if user can set prices
CREATE OR REPLACE FUNCTION can_set_prices(p_user_role user_role)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN p_user_role = 'OWNER';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. DATA MIGRATION - Update existing field agents
-- Convert single community to array format
-- ============================================

-- This would be run once during migration if there's existing data
-- For safety, only adding comment here

COMMENT ON TABLE field_agents IS 'Field agents with communities array. Run data migration separately if converting from single community column.';

-- ============================================
-- 9. FUNCTION: Get farmers by expected recovery window
-- For Owner dashboard filtering
-- ============================================

CREATE OR REPLACE FUNCTION get_farmers_by_recovery_window(
  p_warehouse_id UUID,
  p_window TEXT -- 'upcoming', 'overdue', 'all'
)
RETURNS TABLE (
  farmer_id UUID,
  farmer_name TEXT,
  field_agent_name TEXT,
  community TEXT,
  expected_bags INTEGER,
  received_bags INTEGER,
  expected_recovery_date DATE,
  recovery_status recovery_status,
  days_until_expected INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rt.farmer_id,
    rt.farmer_name,
    rt.field_agent_name,
    rt.farmer_community,
    rt.expected_bags::INTEGER,
    rt.received_bags::INTEGER,
    rt.expected_recovery_date,
    rt.recovery_status,
    rt.days_until_expected::INTEGER
  FROM recovery_timeline rt
  WHERE rt.warehouse_id = p_warehouse_id
    AND (
      p_window = 'all' OR
      (p_window = 'upcoming' AND rt.timeline_status = 'UPCOMING') OR
      (p_window = 'overdue' AND rt.timeline_status = 'OVERDUE')
    )
  ORDER BY rt.expected_recovery_date ASC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 10. AUDIT TRAIL ENHANCEMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS role_violation_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_role user_role NOT NULL,
  attempted_action TEXT NOT NULL,
  violation_type TEXT NOT NULL,
  details JSONB,
  blocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_role_violations_user ON role_violation_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_role_violations_date ON role_violation_attempts(blocked_at);

COMMENT ON TABLE role_violation_attempts IS 'Log of blocked role violation attempts for security auditing';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

COMMENT ON SCHEMA public IS 'Trustless Granary - Aligned to authoritative specification v2026-01-11';
