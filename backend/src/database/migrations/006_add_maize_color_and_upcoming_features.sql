-- Migration 006: Add Maize Color and Upcoming Recovery Features
-- Date: 2026-01-14
-- Purpose: Add maize color specification and support for upcoming recoveries dashboard

-- Add maize_color column to service_records
ALTER TABLE service_records 
ADD COLUMN IF NOT EXISTS maize_color VARCHAR(10) CHECK (maize_color IN ('RED', 'WHITE', NULL));

-- Add index for expected_recovery_date queries (for upcoming recoveries)
CREATE INDEX IF NOT EXISTS idx_service_records_expected_recovery_date 
ON service_records(expected_recovery_date) 
WHERE expected_recovery_date IS NOT NULL AND recovery_status IN ('PENDING', 'HARVESTED', 'PARTIAL');

-- Create view for upcoming recoveries (next 4 weeks)
CREATE OR REPLACE VIEW upcoming_recoveries AS
SELECT 
  sr.id AS service_record_id,
  f.id AS farmer_id,
  f.name AS farmer_name,
  fa.id AS field_agent_id,
  fa.name AS field_agent_name,
  sr.warehouse_id,
  sr.expected_bags,
  sr.expected_recovery_date,
  sr.maize_color,
  rt.received_bags,
  rt.recovery_status,
  sr.created_at AS service_date,
  EXTRACT(DAY FROM (sr.expected_recovery_date::timestamp - CURRENT_DATE::timestamp))::integer AS days_until_recovery,
  sr.date_update_history
FROM service_records sr
INNER JOIN farmers f ON sr.farmer_id = f.id
INNER JOIN field_agents fa ON sr.field_agent_id = fa.id
LEFT JOIN recovery_tracking rt ON sr.id = rt.service_record_id
WHERE sr.expected_recovery_date IS NOT NULL
  AND sr.expected_recovery_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '4 weeks'
  AND rt.recovery_status IN ('PENDING', 'HARVESTED', 'PARTIAL')
ORDER BY sr.expected_recovery_date ASC;

-- Add comment
COMMENT ON VIEW upcoming_recoveries IS 'Shows service records with expected recovery dates within the next 4 weeks, updates daily based on CURRENT_DATE';
COMMENT ON COLUMN service_records.maize_color IS 'Color specification for maize crop (RED or WHITE), null for other crops';
