-- ============================================
-- MIGRATION 005: ADD NOTES FIELD TO SERVICE RECORDS
-- Support for OTHER service type requiring notes
-- ============================================

ALTER TABLE service_records 
ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN service_records.notes IS 'Required when OTHER service type is selected';
