-- ============================================
-- MIGRATION: Field Agent & Outgrower Support
-- Date: 2026-01-06
-- Backward Compatible: YES
-- Safe to run on existing data: YES
-- ============================================

-- ============================================
-- 1. NEW ENUMS - Only add if they don't exist
-- ============================================
-- Note: Using DO blocks to check before creating types

DO $$ BEGIN
  CREATE TYPE recovery_status AS ENUM (
    'PENDING',      -- Service recorded, harvest not completed
    'HARVESTED',    -- Harvest completed, awaiting stock
    'PARTIAL',      -- Some bags received, not complete
    'COMPLETED'     -- Full recovery received
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE field_agent_status AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'SUSPENDED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE farmer_status AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'SUSPENDED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE service_type AS ENUM (
    'LAND_CLEARING',
    'PLOWING',
    'PLANTING',
    'WEEDING',
    'FERTILIZING',
    'PEST_CONTROL',
    'HARVESTING',
    'THRESHING',
    'DRYING',
    'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 2. FIELD AGENT TABLE
-- ============================================

CREATE TABLE field_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE,
  community VARCHAR(255) NOT NULL,
  status field_agent_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_field_agents_status ON field_agents(status);
CREATE INDEX idx_field_agents_community ON field_agents(community);

-- ============================================
-- 3. WAREHOUSE-FIELD AGENT MAPPING
-- ============================================

CREATE TABLE warehouse_field_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL,
  field_agent_id UUID NOT NULL,
  assigned_by UUID NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
  FOREIGN KEY (field_agent_id) REFERENCES field_agents(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id),
  UNIQUE (warehouse_id, field_agent_id)
);

CREATE INDEX idx_warehouse_field_agents_warehouse ON warehouse_field_agents(warehouse_id);
CREATE INDEX idx_warehouse_field_agents_agent ON warehouse_field_agents(field_agent_id);

-- ============================================
-- 4. FARMER TABLE (Outgrower)
-- ============================================

CREATE TABLE farmers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_agent_id UUID NOT NULL,
  warehouse_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  community VARCHAR(255),
  status farmer_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL,
  FOREIGN KEY (field_agent_id) REFERENCES field_agents(id) ON DELETE RESTRICT,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_farmers_field_agent ON farmers(field_agent_id);
CREATE INDEX idx_farmers_warehouse ON farmers(warehouse_id);
CREATE INDEX idx_farmers_status ON farmers(status);

-- ============================================
-- 5. SERVICE RECORD TABLE
-- ============================================

CREATE TABLE service_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL,
  field_agent_id UUID NOT NULL,
  warehouse_id UUID NOT NULL,
  
  -- Service details
  service_types service_type[] NOT NULL DEFAULT '{}',
  land_services JSONB,  -- Array of {service_type, date, notes}
  land_size_acres NUMERIC(10, 2),
  
  -- Inputs provided
  fertilizer_type VARCHAR(255),
  fertilizer_quantity_kg NUMERIC(10, 2),
  pesticide_type VARCHAR(255),
  pesticide_quantity_liters NUMERIC(10, 2),
  
  -- Expectations
  expected_bags INTEGER NOT NULL DEFAULT 0,
  
  -- Status tracking
  recovery_status recovery_status NOT NULL DEFAULT 'PENDING',
  harvest_completed_at TIMESTAMP,
  
  -- Timeline
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  harvest_completed_by UUID,
  
  FOREIGN KEY (farmer_id) REFERENCES farmers(id) ON DELETE RESTRICT,
  FOREIGN KEY (field_agent_id) REFERENCES field_agents(id) ON DELETE RESTRICT,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
  FOREIGN KEY (harvest_completed_by) REFERENCES users(id)
);

CREATE INDEX idx_service_records_farmer ON service_records(farmer_id);
CREATE INDEX idx_service_records_field_agent ON service_records(field_agent_id);
CREATE INDEX idx_service_records_warehouse ON service_records(warehouse_id);
CREATE INDEX idx_service_records_status ON service_records(recovery_status);

-- ============================================
-- 6. RECOVERY TRACKING TABLE
-- ============================================

CREATE TABLE recovery_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_record_id UUID NOT NULL,
  farmer_id UUID NOT NULL,
  warehouse_id UUID NOT NULL,
  
  -- Expected vs Received
  expected_bags INTEGER NOT NULL,
  received_bags INTEGER NOT NULL DEFAULT 0,
  
  -- Status
  recovery_status recovery_status NOT NULL DEFAULT 'PENDING',
  
  -- References
  batch_id UUID,  -- Link to batch created from recovery inbound
  
  -- Timeline
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  
  FOREIGN KEY (service_record_id) REFERENCES service_records(id) ON DELETE RESTRICT,
  FOREIGN KEY (farmer_id) REFERENCES farmers(id) ON DELETE RESTRICT,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
  FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL
);

CREATE INDEX idx_recovery_tracking_service_record ON recovery_tracking(service_record_id);
CREATE INDEX idx_recovery_tracking_farmer ON recovery_tracking(farmer_id);
CREATE INDEX idx_recovery_tracking_warehouse ON recovery_tracking(warehouse_id);
CREATE INDEX idx_recovery_tracking_status ON recovery_tracking(recovery_status);

-- ============================================
-- 7. EXTEND USER_ROLE ENUM
-- ============================================

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'FIELD_AGENT';

-- ============================================
-- 8. EXTEND EVENT_TYPE ENUM
-- ============================================

ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'SERVICE_RECORDED';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'HARVEST_COMPLETED';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'RECOVERY_INBOUND_RECORDED';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'AGGREGATED_INBOUND_RECORDED';

-- ============================================
-- 8. EXTEND BATCH TABLE WITH OUTGROWER FIELDS
-- ============================================

ALTER TABLE batches ADD COLUMN IF NOT EXISTS source_subtype VARCHAR(50);
ALTER TABLE batches ADD COLUMN IF NOT EXISTS farmer_id UUID;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS field_agent_id UUID;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS recovery_reference_id UUID;

-- Add foreign keys
ALTER TABLE batches 
  ADD CONSTRAINT fk_batches_farmer FOREIGN KEY (farmer_id) REFERENCES farmers(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_batches_field_agent FOREIGN KEY (field_agent_id) REFERENCES field_agents(id) ON DELETE SET NULL;

-- ============================================
-- 9. EXTEND REQUEST_PROJECTIONS FOR EXPECTED INVENTORY
-- ============================================

ALTER TABLE request_projections ADD COLUMN IF NOT EXISTS farmer_id UUID;
ALTER TABLE request_projections ADD COLUMN IF NOT EXISTS field_agent_id UUID;
ALTER TABLE request_projections ADD COLUMN IF NOT EXISTS recovery_status recovery_status;
ALTER TABLE request_projections ADD COLUMN IF NOT EXISTS source_type_subtype VARCHAR(50);

-- ============================================
-- 10. CREATE EXPECTED INVENTORY PROJECTION VIEW
-- ============================================

CREATE OR REPLACE VIEW expected_inventory AS
SELECT
  sr.warehouse_id,
  sr.farmer_id,
  sr.field_agent_id,
  sr.id AS service_record_id,
  sr.expected_bags,
  COALESCE(rt.received_bags, 0) AS received_bags,
  sr.expected_bags - COALESCE(rt.received_bags, 0) AS outstanding_bags,
  sr.recovery_status,
  rt.completed_at,
  sr.created_at,
  f.name AS farmer_name,
  fa.name AS field_agent_name
FROM service_records sr
LEFT JOIN farmers f ON sr.farmer_id = f.id
LEFT JOIN field_agents fa ON sr.field_agent_id = fa.id
LEFT JOIN recovery_tracking rt ON sr.id = rt.service_record_id
WHERE f.status = 'ACTIVE' AND fa.status = 'ACTIVE';

-- ============================================
-- 11. SECURITY FUNCTIONS (FIELD AGENT SCOPE)
-- ============================================

CREATE OR REPLACE FUNCTION is_field_agent_assigned(p_field_agent_id UUID, p_warehouse_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM warehouse_field_agents
    WHERE field_agent_id = p_field_agent_id
    AND warehouse_id = p_warehouse_id
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_field_agent_warehouses(p_field_agent_id UUID)
RETURNS TABLE(warehouse_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT wfa.warehouse_id FROM warehouse_field_agents wfa
  WHERE wfa.field_agent_id = p_field_agent_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 12. AUDIT & LOGGING
-- ============================================

CREATE TABLE IF NOT EXISTS field_agent_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_agent_id UUID,
  action VARCHAR(255),
  details JSONB,
  created_by UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (field_agent_id) REFERENCES field_agents(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_field_agent_audit_log_agent ON field_agent_audit_log(field_agent_id);
CREATE INDEX idx_field_agent_audit_log_date ON field_agent_audit_log(created_at);
