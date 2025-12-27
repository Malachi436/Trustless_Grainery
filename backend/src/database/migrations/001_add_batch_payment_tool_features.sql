-- ============================================
-- MIGRATION: Add Batch-Aware, Payment, and Tool Features
-- Date: 2025-12-26
-- Backward Compatible: YES
-- Safe to run on existing data: YES
-- ============================================

-- ============================================
-- 1. EXTEND EVENT TYPES (Additive)
-- ============================================

-- Add new event types to existing enum
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'PAYMENT_CONFIRMED';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'TOOL_ASSIGNED';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'TOOL_RETURNED';

-- ============================================
-- 2. NEW ENUMS FOR BATCHES AND PAYMENT
-- ============================================

-- Batch source types
CREATE TYPE batch_source_type AS ENUM ('OWN_FARM', 'SME', 'SMALL_FARMER');

-- Buyer classification
CREATE TYPE buyer_type AS ENUM ('AGGREGATOR', 'OFF_TAKER', 'OPEN_MARKET');

-- Payment methods
CREATE TYPE payment_method AS ENUM ('CASH', 'BANK_TRANSFER', 'CHEQUE', 'IN_KIND', 'CREDIT');

-- Payment status
CREATE TYPE payment_status AS ENUM ('PAID', 'PENDING', 'CONFIRMED');

-- Tool status
CREATE TYPE tool_status AS ENUM ('AVAILABLE', 'ASSIGNED', 'RETIRED');

-- ============================================
-- 3. BATCHES TABLE (New)
-- ============================================

CREATE TABLE batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL,
  crop_type crop_type NOT NULL,
  source_type batch_source_type NOT NULL DEFAULT 'OWN_FARM',
  source_name VARCHAR(255) NULL,
  source_location VARCHAR(500) NULL,
  purchase_price_per_bag NUMERIC(10, 2) NULL,
  initial_bags INTEGER NOT NULL,
  remaining_bags INTEGER NOT NULL DEFAULT 0, -- Derived from events
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_batches_warehouse ON batches(warehouse_id);
CREATE INDEX idx_batches_crop ON batches(crop_type);
CREATE INDEX idx_batches_source ON batches(source_type);

-- ============================================
-- 4. TOOLS TABLE (New)
-- ============================================

CREATE TABLE tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL,
  tool_type VARCHAR(100) NOT NULL,
  internal_tag VARCHAR(50) NOT NULL UNIQUE, -- Auto-generated (e.g., "HOE-001")
  status tool_status NOT NULL DEFAULT 'AVAILABLE',
  assigned_to_attendant_id UUID NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (assigned_to_attendant_id) REFERENCES users(id)
);

CREATE INDEX idx_tools_warehouse ON tools(warehouse_id);
CREATE INDEX idx_tools_status ON tools(status);
CREATE INDEX idx_tools_assigned ON tools(assigned_to_attendant_id);
CREATE INDEX idx_tools_type ON tools(tool_type);

-- ============================================
-- 5. BATCH ALLOCATIONS (Projection)
-- Tracks which batches were used in which dispatches
-- ============================================

CREATE TABLE batch_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL,
  batch_id UUID NOT NULL,
  bags_allocated INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES request_projections(request_id),
  FOREIGN KEY (batch_id) REFERENCES batches(id)
);

CREATE INDEX idx_batch_allocations_request ON batch_allocations(request_id);
CREATE INDEX idx_batch_allocations_batch ON batch_allocations(batch_id);

-- ============================================
-- 6. EXTEND REQUEST PROJECTIONS (Additive)
-- Add new columns for payment and buyer classification
-- ============================================

-- Buyer classification fields
ALTER TABLE request_projections 
  ADD COLUMN buyer_type buyer_type NULL,
  ADD COLUMN buyer_phone_updated VARCHAR(20) NULL; -- New field, keeps old buyer_phone

-- Payment fields
ALTER TABLE request_projections 
  ADD COLUMN payment_method payment_method NULL,
  ADD COLUMN payment_status payment_status NULL,
  ADD COLUMN price_per_bag NUMERIC(10, 2) NULL,
  ADD COLUMN total_amount NUMERIC(12, 2) NULL,
  ADD COLUMN payment_confirmed_by UUID NULL,
  ADD COLUMN payment_confirmed_at TIMESTAMP NULL;

-- Add foreign key for payment confirmation
ALTER TABLE request_projections 
  ADD CONSTRAINT fk_payment_confirmed_by 
  FOREIGN KEY (payment_confirmed_by) REFERENCES users(id);

-- ============================================
-- 7. COMMENTS FOR CLARITY
-- ============================================

COMMENT ON TABLE batches IS 'Tracks batches of inventory with source information. Remaining bags derived from events.';
COMMENT ON TABLE tools IS 'Individual tool inventory with assignment tracking via events.';
COMMENT ON TABLE batch_allocations IS 'Projection: maps which batches were used in which dispatch requests.';
COMMENT ON COLUMN request_projections.buyer_type IS 'Classification of buyer (AGGREGATOR, OFF_TAKER, OPEN_MARKET). NULL for legacy requests.';
COMMENT ON COLUMN request_projections.payment_status IS 'Payment status. NULL for legacy requests or defaults to PAID for non-credit.';
COMMENT ON COLUMN request_projections.buyer_phone_updated IS 'New buyer phone field. buyer_phone kept for backward compatibility.';

-- ============================================
-- 8. SAFE DEFAULTS FOR EXISTING DATA
-- ============================================

-- No updates needed - all new columns are NULL by default
-- Legacy data continues to work without modification

