-- Minimal price history table for just spot price and timestamp
CREATE TABLE IF NOT EXISTS price_history (
    id BIGSERIAL PRIMARY KEY,
    fetch_spot NUMERIC NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster queries by timestamp
CREATE INDEX IF NOT EXISTS idx_price_history_timestamp ON price_history(timestamp);

-- Enable Row Level Security (RLS)
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

-- Open up access for dev/test
CREATE POLICY "Allow all" ON price_history
    FOR ALL USING (true);