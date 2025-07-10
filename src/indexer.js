import axios from 'axios';
import { createPublicClient, http } from 'viem';
import { mainnet, polygon, arbitrum } from 'viem/chains';
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

// Initialize Viem client based on network
const getViemClient = (networkId) => {
  const rpcUrl = process.env.RPC_URL;
  
  return createPublicClient({
    chain: networkId === 137 ? polygon : networkId === 42161 ? arbitrum : mainnet,
    transport: http(rpcUrl)
  });
};

// Contract ABI - importing from the existing file
import { lpManagerAbi } from '../lpmanager-abi.js';

class LPManagerIndexer {
  constructor() {
    this.contractAddress = process.env.CONTRACT_ADDRESS;
    this.networkId = parseInt(process.env.CHAIN_ID) || 1;
    this.client = getViemClient(this.networkId);
    
    if (!this.contractAddress) {
      throw new Error('CONTRACT_ADDRESS is required in environment variables');
    }
  }

  async readContractData() {
    try {
      console.log('Reading contract data...');
      
      // Define token addresses for testing
      const TOKEN0_ADDRESS = "0xF197FFC28c23E0309B5559e7a166f2c6164C80aA";
      const TOKEN1_ADDRESS = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";
      const AMOUNT_IN = BigInt(10 ** 6); // 1 token with 6 decimals
      
      // Read fetchSpot and fetchOracle functions
      const [fetchSpotResult, fetchOracleResult] = await Promise.all([
        this.client.readContract({
          address: this.contractAddress,
          abi: lpManagerAbi,
          functionName: 'fetchSpot',
          args: [TOKEN1_ADDRESS, TOKEN0_ADDRESS, AMOUNT_IN]
        }),
        this.client.readContract({
          address: this.contractAddress,
          abi: lpManagerAbi,
          functionName: 'fetchOracle',
          args: [TOKEN1_ADDRESS, TOKEN0_ADDRESS, AMOUNT_IN]
        })
      ]);

      // Get current block number and timestamp
      const blockNumber = await this.client.getBlockNumber();
      const block = await this.client.getBlock({ blockNumber });

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