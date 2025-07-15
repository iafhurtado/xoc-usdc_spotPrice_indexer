import axios from 'axios';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import dotenv from 'dotenv';
import { lpManagerAbi } from '../lpmanager-abi.js';

// Load environment variables
dotenv.config();

async function testSetup() {
  console.log('🧪 Testing LP Manager Indexer Setup...\n');

  let allTestsPassed = true;

  // Test 1: Environment Variables
  console.log('1. Checking environment variables...');
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_KEY',
    'RPC_URL',
    'CONTRACT_ADDRESS',
    'CHAIN_ID'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing environment variables:', missingVars);
    console.log('Please check your .env file');
    allTestsPassed = false;
  } else {
    console.log('✅ Environment variables loaded successfully');
  }

  // Test 2: Supabase Connection
  console.log('\n2. Testing Supabase connection...');
  try {
    const supabase = axios.create({
      baseURL: `${process.env.SUPABASE_URL}/rest/v1`,
      headers: {
        apikey: process.env.SUPABASE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      }
    });

    const response = await supabase.get('/lp_manager_snapshots?select=count&limit=1');
    
    if (response.status !== 200) {
      console.error('❌ Supabase connection failed:', response.status, response.statusText);
      console.log('Please check your Supabase URL and API key');
      allTestsPassed = false;
    } else {
      console.log('✅ Supabase connection successful');
    }
  } catch (error) {
    console.error('❌ Supabase connection error:', error.response?.data || error.message);
    allTestsPassed = false;
  }

  // Test 3: RPC Connection
  console.log('\n3. Testing RPC connection...');
  try {
    const client = createPublicClient({
      chain: base,
      transport: http(process.env.RPC_URL)
    });

    const blockNumber = await client.getBlockNumber();
    console.log(`✅ RPC connection successful (Block: ${blockNumber})`);
  } catch (error) {
    console.error('❌ RPC connection failed:', error.message);
    console.log('Please check your RPC URL');
    allTestsPassed = false;
  }

  // Test 4: Contract Address Validation
  console.log('\n4. Testing contract address...');
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress || !contractAddress.startsWith('0x') || contractAddress.length !== 42) {
    console.error('❌ Invalid contract address format');
    console.log('Contract address should be a valid Ethereum address (0x...)');
    allTestsPassed = false;
  } else {
    console.log(`✅ Contract address format valid: ${contractAddress}`);
  }

  // Test 5: Contract Reading
  console.log('\n5. Testing contract reading...');
  try {
    const client = createPublicClient({
      chain: base,
      transport: http(process.env.RPC_URL)
    });

    // Try to read a simple function
    const totalSupply = await client.readContract({
      address: contractAddress,
      abi: lpManagerAbi,
      functionName: 'totalSupply'
    });

    console.log(`✅ Contract reading successful (Total Supply: ${totalSupply})`);
  } catch (error) {
    console.error('❌ Contract reading failed:', error.message);
    console.log('This might be expected if the contract is not deployed or on a different network');
    console.log('Check your contract address and network configuration');
    allTestsPassed = false;
  }

  // Test 6: Database Schema
  console.log('\n6. Testing database schema...');
  try {
    const supabase = axios.create({
      baseURL: `${process.env.SUPABASE_URL}/rest/v1`,
      headers: {
        apikey: process.env.SUPABASE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      }
    });

    // Check if the table exists by trying to insert a test record
    const testData = {
      contract_address: '0x0000000000000000000000000000000000000000',
      chain_id: 8453,
      block_number: 0,
      timestamp: new Date().toISOString(),
      block_timestamp: new Date().toISOString(),
      fetch_spot: '0',
      fetch_oracle: '0',
      amount_in: '1000000',
      token0_address: '0x0000000000000000000000000000000000000000',
      token1_address: '0x0000000000000000000000000000000000000000'
    };

    const insertResponse = await supabase.post('/price_history', [testData]);
    
    if (insertResponse.status !== 201) {
      console.error('❌ Database schema test failed:', insertResponse.status, insertResponse.statusText);
      console.log('Please run the SQL schema from supabase-schema.sql');
      allTestsPassed = false;
    } else {
      console.log('✅ Database schema is correct');
      
      // Clean up test data
      try {
        await supabase.delete('/price_history?contract_address=eq.0x0000000000000000000000000000000000000000&chain_id=eq.8453');
        console.log('✅ Test data cleaned up');
      } catch (cleanupError) {
        console.warn('⚠️ Could not clean up test data:', cleanupError.message);
      }
    }
  } catch (error) {
    console.error('❌ Database schema test error:', error.response?.data || error.message);
    allTestsPassed = false;
  }

  // Test 7: Network Configuration
  console.log('\n7. Testing network configuration...');
  const chainId = parseInt(process.env.CHAIN_ID) || 1;
  const supportedNetworks = [8453];
  
  if (!supportedNetworks.includes(chainId)) {
    console.warn(`⚠️ Chain ID ${chainId} is not in the standard supported networks`);
    console.log('Supported networks: 8453(Base)');
  } else {
    const networkNames = { 8453: 'Base'};
    console.log(`✅ Network configuration valid: ${networkNames[chainId]} (Chain ID: ${chainId})`);
  }

  // Test 8: ABI Validation
  console.log('\n8. Testing ABI validation...');
  try {
    if (!lpManagerAbi || !Array.isArray(lpManagerAbi)) {
      throw new Error('ABI is not a valid array');
    }
    
    const requiredFunctions = ['fetchSpot', 'fetchOracle'];
    const abiFunctionNames = lpManagerAbi
      .filter(item => item.type === 'function')
      .map(item => item.name);
    
    const missingFunctions = requiredFunctions.filter(func => !abiFunctionNames.includes(func));
    
    if (missingFunctions.length > 0) {
      throw new Error(`Missing required functions: ${missingFunctions.join(', ')}`);
    }
    
    console.log(`✅ ABI validation successful (${abiFunctionNames.length} functions found)`);
  } catch (error) {
    console.error('❌ ABI validation failed:', error.message);
    allTestsPassed = false;
  }

  // Test 9: Full Indexer Test
  console.log('\n9. Testing full indexer functionality...');
  try {
    const { default: indexer } = await import('./indexer.js');
    
    // Test reading contract data
    const contractData = await indexer.readContractData();
    
    if (!contractData || typeof contractData !== 'object') {
      throw new Error('Contract data is not a valid object');
    }
    
    const requiredFields = ['contract_address', 'chain_id', 'fetch_spot', 'fetch_oracle', 'timestamp'];
    const missingFields = requiredFields.filter(field => !(field in contractData));
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
    
    console.log('✅ Full indexer test successful');
    console.log(`   Contract: ${contractData.contract_address}`);
    console.log(`   Chain ID: ${contractData.chain_id}`);
    console.log(`   Fetch Spot: ${contractData.fetch_spot}`);
    console.log(`   Fetch Oracle: ${contractData.fetch_oracle}`);
    console.log(`   Timestamp: ${contractData.timestamp}`);
    
  } catch (error) {
    console.error('❌ Full indexer test failed:', error.message);
    allTestsPassed = false;
  }

  // Final Results
  console.log('\n' + '='.repeat(50));
  if (allTestsPassed) {
    console.log('🎉 All tests passed! Your indexer is ready to run.');
    console.log('\nNext steps:');
    console.log('1. Run "npm start" to test the indexer');
    console.log('2. Set up GitHub secrets for automated runs');
    console.log('3. Monitor the GitHub Actions tab');
  } else {
    console.log('❌ Some tests failed. Please fix the issues above before proceeding.');
    console.log('\nCommon fixes:');
    console.log('- Check your .env file has all required variables');
    console.log('- Verify your Supabase project and API keys');
    console.log('- Ensure your RPC endpoint is working');
    console.log('- Confirm your contract address is correct');
  }
  console.log('='.repeat(50));

  return allTestsPassed;
}

// Run the test
testSetup().catch(console.error); 