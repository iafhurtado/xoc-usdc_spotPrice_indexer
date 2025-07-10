-- Create the lp_manager_snapshots table
CREATE TABLE IF NOT EXISTS lp_manager_snapshots (
    id BIGSERIAL PRIMARY KEY,
    contract_address TEXT NOT NULL,
    network_id INTEGER NOT NULL,
    block_number BIGINT NOT NULL,
    block_time TIMESTAMPTZ NOT NULL,  -- Changed from 'timestamp' to 'block_time'
    block_timestamp TIMESTAMPTZ NOT NULL,
    
    -- Contract state
    total_supply NUMERIC NOT NULL,
    total_amount0 NUMERIC NOT NULL,
    total_amount1 NUMERIC NOT NULL,
    current_tick INTEGER NOT NULL,
    base_lower INTEGER NOT NULL,
    base_upper INTEGER NOT NULL,
    fee NUMERIC NOT NULL,
    fee_split NUMERIC NOT NULL,
    max_total_supply NUMERIC NOT NULL,
    deposit0_max NUMERIC NOT NULL,
    deposit1_max NUMERIC NOT NULL,
    allow_token0 BOOLEAN NOT NULL,
    allow_token1 BOOLEAN NOT NULL,
    active_depositor_whitelist BOOLEAN NOT NULL,
    action_block_delay NUMERIC NOT NULL,
    hysteresis NUMERIC NOT NULL,
    bps_range_lower NUMERIC NOT NULL,
    bps_range_upper NUMERIC NOT NULL,
    affiliate TEXT NOT NULL,
    fee_recipient TEXT NOT NULL,
    usd_oracle0_ref TEXT NOT NULL,
    usd_oracle1_ref TEXT NOT NULL,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_lp_manager_snapshots_contract_address ON lp_manager_snapshots(contract_address);
CREATE INDEX IF NOT EXISTS idx_lp_manager_snapshots_network_id ON lp_manager_snapshots(network_id);
CREATE INDEX IF NOT EXISTS idx_lp_manager_snapshots_block_number ON lp_manager_snapshots(block_number);
CREATE INDEX IF NOT EXISTS idx_lp_manager_snapshots_block_time ON lp_manager_snapshots(block_time);  -- Changed from 'timestamp' to 'block_time'
CREATE INDEX IF NOT EXISTS idx_lp_manager_snapshots_contract_network ON lp_manager_snapshots(contract_address, network_id);

-- Create a composite index for time-based queries
CREATE INDEX IF NOT EXISTS idx_lp_manager_snapshots_time_range ON lp_manager_snapshots(contract_address, network_id, block_time);  -- Changed from 'timestamp' to 'block_time'

-- Enable Row Level Security (RLS)
ALTER TABLE lp_manager_snapshots ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations (you can customize this based on your needs)
CREATE POLICY "Allow all operations on lp_manager_snapshots" ON lp_manager_snapshots
    FOR ALL USING (true);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update the updated_at column
CREATE TRIGGER update_lp_manager_snapshots_updated_at 
    BEFORE UPDATE ON lp_manager_snapshots 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create a view for the latest snapshot per contract
CREATE OR REPLACE VIEW latest_lp_manager_snapshots WITH (security_invoker=on) AS
SELECT DISTINCT ON (contract_address, network_id) *
FROM lp_manager_snapshots
ORDER BY contract_address, network_id, block_time DESC;  -- Changed from 'timestamp' to 'block_time'

-- Create a function to get historical data for a contract
CREATE OR REPLACE FUNCTION get_contract_history(
    p_contract_address TEXT,
    p_network_id INTEGER,
    p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    contract_address TEXT,
    network_id INTEGER,
    block_number BIGINT,
    block_time TIMESTAMPTZ,  -- Changed from 'timestamp' to 'block_time'
    total_supply NUMERIC,
    total_amount0 NUMERIC,
    total_amount1 NUMERIC,
    current_tick INTEGER,
    fee NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lms.contract_address,
        lms.network_id,
        lms.block_number,
        lms.block_time,  -- Changed from 'timestamp' to 'block_time'
        lms.total_supply,
        lms.total_amount0,
        lms.total_amount1,
        lms.current_tick,
        lms.fee
    FROM lp_manager_snapshots lms
    WHERE lms.contract_address = p_contract_address
      AND lms.network_id = p_network_id
      AND lms.block_time >= NOW() - INTERVAL '1 day' * p_days_back  -- Changed from 'timestamp' to 'block_time'
    ORDER BY lms.block_time DESC;  -- Changed from 'timestamp' to 'block_time'
END;
$$ LANGUAGE plpgsql;