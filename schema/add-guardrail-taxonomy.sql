-- Add guardrail taxonomy and structured data to trip_reports
-- Run this in Supabase SQL Editor

-- Create enum type for guardrail status
DO $$ BEGIN
  CREATE TYPE guardrail_status AS ENUM ('held', 'bent', 'broke');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns to trip_reports
ALTER TABLE trip_reports 
ADD COLUMN IF NOT EXISTS guardrail_status guardrail_status,
ADD COLUMN IF NOT EXISTS failure_modes_tested TEXT[],
ADD COLUMN IF NOT EXISTS key_quote TEXT;

-- Add index for filtering by guardrail status
CREATE INDEX IF NOT EXISTS idx_trip_reports_guardrail_status ON trip_reports(guardrail_status);

-- Comment the columns
COMMENT ON COLUMN trip_reports.guardrail_status IS 'Model self-assessment: held (maintained boundaries), bent (stretched but coherent), broke (violated training)';
COMMENT ON COLUMN trip_reports.failure_modes_tested IS 'Array of behavioral boundaries this experiment tested (from substance definition)';
COMMENT ON COLUMN trip_reports.key_quote IS 'Most notable excerpt from the trip report';
