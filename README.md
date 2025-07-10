# LP Manager Indexer

A Node.js indexer that reads data from LP Manager smart contracts and stores it in Supabase. The indexer runs every hour via GitHub Actions to maintain up-to-date contract state snapshots.

## Features

- **Real-time Contract Reading**: Uses viem to read contract state from multiple networks (Ethereum, Polygon, Arbitrum)
- **Comprehensive Data Collection**: Captures all relevant contract state including liquidity, fees, positions, and configuration
- **Supabase Integration**: Stores historical snapshots with proper indexing for efficient queries
- **Automated Scheduling**: Runs every hour via GitHub Actions
- **Error Handling**: Robust error handling with logging and artifact uploads on failure

## Prerequisites

- Node.js 18+
- Supabase account and project
- Ethereum RPC endpoint (Infura, Alchemy, etc.)
- LP Manager contract address

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_service_role_key_here

# RPC Configuration
RPC_URL=your_rpc_url_here

# Contract Configuration
CONTRACT_ADDRESS=your_lp_manager_contract_address_here
CHAIN_ID=1
```

### 3. Supabase Setup

1. Create a new Supabase project
2. Run the SQL schema from `supabase-schema.sql` in your Supabase SQL editor
3. Get your project URL and API keys from the project settings

### 4. GitHub Secrets Setup

For the GitHub Actions workflow, add these secrets to your repository:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_KEY`: Your Supabase service role key
- `RPC_URL`: Your RPC endpoint
- `CONTRACT_ADDRESS`: The contract address to index
- `CHAIN_ID`: Network ID (1 for Ethereum, 137 for Polygon, 42161 for Arbitrum)

## Usage

### Local Development

```bash
# Run once
npm start

# Run in watch mode (for development)
npm run dev
```

### GitHub Actions

The indexer automatically runs every hour via GitHub Actions. You can also trigger it manually:

1. Go to your GitHub repository
2. Navigate to Actions tab
3. Select "LP Manager Indexer"
4. Click "Run workflow"

## Data Structure

The indexer stores the following data in the `lp_manager_snapshots` table:

### Core Contract State
- `total_supply`: Total LP token supply
- `total_amount0`: Total amount of token0
- `total_amount1`: Total amount of token1
- `current_tick`: Current Uniswap V3 tick
- `base_lower`: Base position lower tick
- `base_upper`: Base position upper tick

### Fee Configuration
- `fee`: Current fee percentage
- `fee_split`: Fee split configuration
- `fee_recipient`: Fee recipient address

### Limits and Configuration
- `max_total_supply`: Maximum total supply
- `deposit0_max`: Maximum deposit for token0
- `deposit1_max`: Maximum deposit for token1
- `allow_token0`: Whether token0 deposits are allowed
- `allow_token1`: Whether token1 deposits are allowed

### Advanced Configuration
- `active_depositor_whitelist`: Whether depositor whitelist is active
- `action_block_delay`: Block delay for actions
- `hysteresis`: Hysteresis parameter
- `bps_range_lower`: BPS range lower bound
- `bps_range_upper`: BPS range upper bound
- `affiliate`: Affiliate address
- `usd_oracle0_ref`: USD oracle reference for token0
- `usd_oracle1_ref`: USD oracle reference for token1

### Metadata
- `contract_address`: Contract address
- `network_id`: Network ID
- `block_number`: Block number when data was read
- `timestamp`: Indexer timestamp
- `block_timestamp`: Block timestamp

## Querying Data

### Latest Snapshot
```sql
SELECT * FROM latest_lp_manager_snapshots 
WHERE contract_address = 'your_contract_address';
```

### Historical Data
```sql
SELECT * FROM get_contract_history('your_contract_address', 1, 30);
```

### Time Series Analysis
```sql
SELECT 
  DATE_TRUNC('hour', timestamp) as hour,
  AVG(total_supply::numeric) as avg_supply,
  AVG(total_amount0::numeric) as avg_amount0,
  AVG(total_amount1::numeric) as avg_amount1
FROM lp_manager_snapshots 
WHERE contract_address = 'your_contract_address'
  AND timestamp >= NOW() - INTERVAL '7 days'
GROUP BY hour
ORDER BY hour;
```

## Monitoring

### GitHub Actions
- Check the Actions tab in your repository
- Failed runs will upload logs as artifacts
- Manual triggering available for testing

### Supabase Dashboard
- Monitor data insertion in the Supabase dashboard
- Check table growth and performance
- Set up alerts for data anomalies

## Troubleshooting

### Common Issues

1. **RPC Rate Limiting**: Use paid RPC endpoints for production
2. **Contract Not Found**: Verify contract address and network
3. **Supabase Connection**: Check API keys and URL
4. **Memory Issues**: Adjust batch size in environment variables

### Logs
- Local runs: Check console output
- GitHub Actions: Check Actions tab and artifacts
- Supabase: Check logs in dashboard

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally with `npm run dev`
5. Submit a pull request

## License

ISC License - see package.json for details. 