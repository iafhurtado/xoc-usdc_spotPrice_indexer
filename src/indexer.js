import axios from 'axios';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase client using axios
const supabase = axios.create({
  baseURL: `${process.env.SUPABASE_URL}/rest/v1`,
  headers: {
    apikey: process.env.SUPABASE_KEY,
    Authorization: `Bearer ${process.env.SUPABASE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=minimal"
  }
});

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
      
      const response = await supabase.post('/price_history', [data]);
      
      if (response.status !== 201) {
        throw new Error(`Supabase error: ${response.status} - ${response.statusText}`);
      }

      console.log('Data stored successfully');
      return response.data;
    } catch (error) {
      console.error('Error storing data in Supabase:', error.response?.data || error.message);
      throw error;
    }
  }

  async index() {
    try {
      console.log(`Starting indexer run at ${new Date().toISOString()}`);
      console.log(`Contract: ${this.contractAddress}`);
      console.log(`Network: Base (${this.networkId})`);
      
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