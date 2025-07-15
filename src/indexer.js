import { createClient } from '@supabase/supabase-js';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Debug environment variables
console.log('🔍 Debugging Environment Variables:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? `"${process.env.SUPABASE_URL}"` : 'undefined');
console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? `"${process.env.SUPABASE_KEY.substring(0, 20)}..."` : 'undefined');
console.log('RPC_URL:', process.env.RPC_URL ? `"${process.env.RPC_URL}"` : 'undefined');
console.log('CONTRACT_ADDRESS:', process.env.CONTRACT_ADDRESS ? `"${process.env.CONTRACT_ADDRESS}"` : 'undefined');
console.log('CHAIN_ID:', process.env.CHAIN_ID ? `"${process.env.CHAIN_ID}"` : 'undefined');

// Validate required environment variables
const requiredEnvVars = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_KEY,
  RPC_URL: process.env.RPC_URL
};

// Check for missing environment variables
const missingVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars);
  console.error('Available environment variables:', Object.keys(process.env));
  console.error('Environment variable details:');
  Object.entries(requiredEnvVars).forEach(([key, value]) => {
    console.error(`  ${key}: ${value ? `"${value}"` : 'undefined/empty'}`);
  });
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

// Initialize Supabase client correctly
const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_KEY
);

// Initialize Viem client for Base network
const getViemClient = () => {
  const rpcUrl = process.env.RPC_URL;
  
  return createPublicClient({
    chain: base,
    transport: http(rpcUrl)
  });
};

// Contract ABI - importing from the existing file
import { lpManagerAbi } from '../lpmanager-abi.js';

class LPManagerIndexer {
  constructor() {
    this.contractAddress = "0xD6DaB267b7C23EdB2ed5605d9f3f37420e88e291";
    this.networkId = 8453; // Base network
    this.client = getViemClient();
    
    if (!this.contractAddress) {
      throw new Error('CONTRACT_ADDRESS is required');
    }
  }

  async readContractData() {
    try {
      console.log('Reading contract data...');
      
      // Define token addresses for Base network
      // USDC (8 decimals) and XOC (18 decimals)
      const TOKEN0_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // USDC
      const TOKEN1_ADDRESS = "0xa411c9Aa00E020e4f88Bc19996d29c5B7ADB4ACf"; // XOC
      
      // Use 1 USDC (8 decimals) as amount in
      const AMOUNT_IN = BigInt(10 ** 8); // 1 USDC
      
      console.log(`Token0 (USDC): ${TOKEN0_ADDRESS}`);
      console.log(`Token1 (XOC): ${TOKEN1_ADDRESS}`);
      console.log(`Amount In: ${AMOUNT_IN} (1 USDC)`);
      
      // Read fetchSpot and fetchOracle functions
      const [fetchSpotResult, fetchOracleResult] = await Promise.all([
        this.client.readContract({
          address: this.contractAddress,
          abi: lpManagerAbi,
          functionName: 'fetchSpot',
          args: [TOKEN0_ADDRESS, TOKEN1_ADDRESS, AMOUNT_IN]
        }),
        this.client.readContract({
          address: this.contractAddress,
          abi: lpManagerAbi,
          functionName: 'fetchOracle',
          args: [TOKEN0_ADDRESS, TOKEN1_ADDRESS, AMOUNT_IN]
        })
      ]);

      // Get current block number and timestamp
      const blockNumber = await this.client.getBlockNumber();
      const block = await this.client.getBlock({ blockNumber });

      console.log(`Fetch Spot Result: ${fetchSpotResult.toString()}`);
      console.log(`Fetch Oracle Result: ${fetchOracleResult.toString()}`);

      const contractData = {
        contract_address: this.contractAddress,
        chain_id: this.networkId,
        block_number: blockNumber,
        timestamp: new Date().toISOString(),
        block_timestamp: new Date(Number(block.timestamp) * 1000).toISOString(),
        
        // Price data
        fetch_spot: fetchSpotResult.toString(),
        fetch_oracle: fetchOracleResult.toString(),
        amount_in: AMOUNT_IN.toString(),
        token0_address: TOKEN0_ADDRESS,
        token1_address: TOKEN1_ADDRESS
      };

      return contractData;
    } catch (error) {
      console.error('Error reading contract data:', error);
      throw error;
    }
  }

  async storeDataInSupabase(data) {
    try {
      console.log('Storing data in Supabase...');
      console.log('Data to insert:', JSON.stringify(data, null, 2));
      
      const { data: insertedData, error } = await supabase
        .from('price_history')
        .insert(data);
      
      if (error) {
        console.error('Detailed Supabase Insert Error:', error);
        throw error;
      }

      console.log('Data stored successfully', insertedData);
      return insertedData;
    } catch (error) {
      console.error('Comprehensive Error:', {
        message: error.message,
        details: error.details,
        stack: error.stack
      });
      throw error;
    }
  }

  async index() {
    try {
      console.log(`Starting indexer run at ${new Date().toISOString()}`);
      console.log(`Contract: ${this.contractAddress}`);
      console.log(`Network: Base (${this.networkId})`);
      console.log(`Supabase URL: ${process.env.SUPABASE_URL ? 'Set' : 'Missing'}`);
      console.log(`Supabase Key: ${process.env.SUPABASE_KEY ? 'Set' : 'Missing'}`);
      console.log(`RPC URL: ${process.env.RPC_URL ? 'Set' : 'Missing'}`);
      
      const contractData = await this.readContractData();
      await this.storeDataInSupabase(contractData);
      
      console.log('Indexer run completed successfully');
    } catch (error) {
      console.error('Indexer run failed:', error);
      throw error;
    }
  }
}

// Main execution
const indexer = new LPManagerIndexer();

// If running directly (not as a module)
if (import.meta.url === `file://${process.argv[1]}`) {
  // Run once immediately
  indexer.index().catch(console.error);
}

export default indexer; 