import { createClient } from '@supabase/supabase-js';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import dotenv from 'dotenv';
import { lpManagerAbi } from '../lpmanager-abi.js';

// Load environment variables
dotenv.config();

// Initialize Supabase client correctly
const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_KEY
);

async function testSetup() {
  console.log('🧪 Testing LP Manager Indexer Setup...\n');

  let allTestsPassed = true;

  // Test 1: Environment Variables
  console.log('1. Checking environment variables...');
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_KEY',
    'RPC_URL'
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
    const { data, error } = await supabase
      .from('price_history')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Supabase connection failed:', error);
      console.log('Please check your Supabase URL and API key');
      allTestsPassed = false;
    } else {
      console.log('✅ Supabase connection successful');
    }
  } catch (error) {
    console.error('❌ Supabase connection error:', error.message);
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
  const contractAddress = "0xD6DaB267b7C23EdB2ed5605d9f3f37420e88e291";
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

    // Try to read fetchSpot function
    const TOKEN0_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // USDC
    const TOKEN1_ADDRESS = "0xa411c9Aa00E020e4f88Bc19996d29c5B7ADB4ACf"; // XOC
    const AMOUNT_IN = BigInt(10 ** 8); // 1 USDC

    const fetchSpot = await client.readContract({
      address: contractAddress,
      abi: lpManagerAbi,
      functionName: 'fetchSpot',
      args: [TOKEN0_ADDRESS, TOKEN1_ADDRESS, AMOUNT_IN]
    });

    console.log(`✅ Contract reading successful (Fetch Spot: ${fetchSpot.toString()})`);
  } catch (error) {
    console.error('❌ Contract reading failed:', error.message);
    console.log('This might be expected if the contract is not deployed or on a different network');
    console.log('Check your contract address and network configuration');
    allTestsPassed = false;
  }

  // Test 6: Database Schema
  console.log('\n6. Testing database schema...');
  try {
    // Check if the table exists by trying to insert a test record
    const testData = {
      fetch_spot: '0'
    };

    const { data: insertedData, error: insertError } = await supabase
      .from('price_history')
      .insert(testData);
    
    if (insertError) {
      console.error('❌ Database schema test failed:', insertError);
      console.log('Please run the SQL schema from supabase-schema.sql');
      allTestsPassed = false;
    } else {
      console.log('✅ Database schema is correct');
      
      // Clean up test data
      try {
        const { error: deleteError } = await supabase
          .from('price_history')
          .delete()
          .eq('fetch_spot', '0');
        
        if (deleteError) {
          console.warn('⚠️ Could not clean up test data:', deleteError.message);
        } else {
          console.log('✅ Test data cleaned up');
        }
      } catch (cleanupError) {
        console.warn('⚠️ Could not clean up test data:', cleanupError.message);
      }
    }
  } catch (error) {
    console.error('❌ Database schema test error:', error.message);
    allTestsPassed = false;
  }

  // Test 7: Network Configuration
  console.log('\n7. Testing network configuration...');
  const supportedNetworks = [8453];
  const chainId = 8453; // Base network
  
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
    
    const requiredFunctions = ['fetchSpot'];
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
    // Import the indexer module
    const indexerModule = await import('./indexer.js');
    
    // Test the indexSpotPrice function
    await indexerModule.indexSpotPrice();
    
    console.log('✅ Full indexer test successful');
    console.log('   Indexer function executed without errors');
    
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