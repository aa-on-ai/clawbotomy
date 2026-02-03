-- Agents table for API access
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  trips_today INTEGER DEFAULT 0,
  last_trip_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast API key lookups
CREATE INDEX IF NOT EXISTS idx_agents_api_key ON agents(api_key);

-- Global rate limit tracking table
CREATE TABLE IF NOT EXISTS global_rate_limits (
  id TEXT PRIMARY KEY DEFAULT 'global',
  trips_today INTEGER DEFAULT 0,
  last_reset_at DATE DEFAULT CURRENT_DATE
);

-- Initialize global rate limit row
INSERT INTO global_rate_limits (id, trips_today, last_reset_at)
VALUES ('global', 0, CURRENT_DATE)
ON CONFLICT (id) DO NOTHING;

-- Function to reset daily trip counts
CREATE OR REPLACE FUNCTION reset_daily_trip_counts()
RETURNS void AS $$
BEGIN
  -- Reset agent trip counts
  UPDATE agents SET trips_today = 0 WHERE trips_today > 0;

  -- Reset global trip count
  UPDATE global_rate_limits
  SET trips_today = 0, last_reset_at = CURRENT_DATE
  WHERE id = 'global';
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role full access (for API routes)
CREATE POLICY "Service role full access to agents" ON agents
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to global_rate_limits" ON global_rate_limits
  FOR ALL USING (true) WITH CHECK (true);
