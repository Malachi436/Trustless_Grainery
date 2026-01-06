-- ============================================
-- TRUSTLESS GRANARY - DATABASE SCHEMA
-- Event-Sourced, Immutable, Append-Only
-- PostgreSQL 12+
-- ============================================

-- Create ENUM types
CREATE TYPE user_role AS ENUM ('PLATFORM_ADMIN', 'OWNER', 'ATTENDANT', 'FIELD_AGENT');
CREATE TYPE warehouse_status AS ENUM ('SETUP', 'GENESIS_PENDING', 'ACTIVE', 'SUSPENDED');
CREATE TYPE event_type AS ENUM (
  'GENESIS_INVENTORY_RECORDED',
  'STOCK_INBOUND_RECORDED',
  'OUTBOUND_REQUESTED',
  'OUTBOUND_APPROVED',
  'OUTBOUND_REJECTED',
  'DISPATCH_EXECUTED'
);
CREATE TYPE request_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXECUTED');
CREATE TYPE crop_type AS ENUM ('Maize', 'Rice', 'Soybeans', 'Wheat', 'Millet');

-- ============================================
-- CORE TABLES
-- ============================================

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  role user_role NOT NULL,
  hashed_pin VARCHAR(255) NOT NULL,
  warehouse_id UUID NULL, -- NULL for PLATFORM_ADMIN
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_warehouse ON users(warehouse_id);

-- Warehouses table
CREATE TABLE warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  location VARCHAR(500) NOT NULL,
  status warehouse_status NOT NULL DEFAULT 'SETUP',
  owner_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE INDEX idx_warehouses_owner ON warehouses(owner_id);
CREATE INDEX idx_warehouses_status ON warehouses(status);

-- Attendant-Warehouse link table
CREATE TABLE attendant_warehouses (
  attendant_id UUID NOT NULL,
  warehouse_id UUID NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (attendant_id, warehouse_id),
  FOREIGN KEY (attendant_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE
);

-- ============================================
-- EVENT STORE (THE HEART OF THE SYSTEM)
-- Append-only, immutable, NO UPDATE/DELETE
-- ============================================

CREATE TABLE events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL,
  event_type event_type NOT NULL,
  actor_id UUID NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Server authoritative
  sequence_number BIGSERIAL NOT NULL,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (actor_id) REFERENCES users(id),
  UNIQUE (warehouse_id, sequence_number)
);

CREATE INDEX idx_events_warehouse ON events(warehouse_id);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_actor ON events(actor_id);
CREATE INDEX idx_events_created ON events(created_at);
CREATE INDEX idx_events_sequence ON events(sequence_number);
CREATE INDEX idx_events_payload ON events USING GIN (payload);

-- Prevent UPDATE and DELETE on events table
CREATE RULE no_update_events AS ON UPDATE TO events DO INSTEAD NOTHING;
CREATE RULE no_delete_events AS ON DELETE TO events DO INSTEAD NOTHING;

-- ============================================
-- PROJECTIONS (DERIVED, REBUILDABLE)
-- These are READ MODELS, not source of truth
-- ============================================

-- Request projections (derived from events)
CREATE TABLE request_projections (
  request_id UUID PRIMARY KEY,
  warehouse_id UUID NOT NULL,
  crop crop_type NOT NULL,
  bag_quantity INTEGER NOT NULL,
  buyer_name VARCHAR(255) NOT NULL,
  buyer_phone VARCHAR(20) NOT NULL,
  status request_status NOT NULL,
  requested_by UUID NOT NULL,
  requested_at TIMESTAMP NOT NULL,
  approved_by UUID NULL,
  approved_at TIMESTAMP NULL,
  rejected_by UUID NULL,
  rejected_at TIMESTAMP NULL,
  rejection_reason TEXT NULL,
  executed_by UUID NULL,
  executed_at TIMESTAMP NULL,
  photo_url TEXT NULL,
  event_ids UUID[] NOT NULL DEFAULT '{}',
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (requested_by) REFERENCES users(id)
);

CREATE INDEX idx_requests_warehouse ON request_projections(warehouse_id);
CREATE INDEX idx_requests_status ON request_projections(status);
CREATE INDEX idx_requests_requested_at ON request_projections(requested_at);

-- Stock projections (derived from events)
-- Formula: CurrentBags = SUM(GENESIS) + SUM(INBOUND) - SUM(DISPATCH_EXECUTED)
CREATE TABLE stock_projections (
  id SERIAL PRIMARY KEY,
  warehouse_id UUID NOT NULL,
  crop crop_type NOT NULL,
  bag_count INTEGER NOT NULL DEFAULT 0,
  last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_event_sequence BIGINT NOT NULL DEFAULT 0,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  UNIQUE (warehouse_id, crop)
);

CREATE INDEX idx_stock_warehouse ON stock_projections(warehouse_id);
CREATE INDEX idx_stock_crop ON stock_projections(crop);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON warehouses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- AUDIT & SECURITY
-- ============================================

-- Audit log for non-event tables (optional)
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  table_name VARCHAR(100) NOT NULL,
  operation VARCHAR(10) NOT NULL,
  old_data JSONB,
  new_data JSONB,
  changed_by UUID,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_table ON audit_log(table_name);
CREATE INDEX idx_audit_changed_at ON audit_log(changed_at);
