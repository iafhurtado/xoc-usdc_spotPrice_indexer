import { createClient } from '@supabase/supabase-js';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { lpManagerAbi } from '../lpmanager-abi.js';

export async function indexSpotPrice() {
  try {
    // Load environment variables (make sure they're set in your env or GitHub Actions)
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_KEY;
    const RPC_URL = process.env.RPC_URL;

    if (!SUPABASE_URL || !SUPABASE_KEY || !RPC_URL) {
      throw new Error('Missing required environment variables: SUPABASE_URL, SUPABASE_KEY, RPC_URL');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const viemClient = createPublicClient({
      chain: base,
      transport: http(RPC_URL)
    });

    // Your contract and tokens
    const CONTRACT_ADDRESS = "0xD6DaB267b7C23EdB2ed5605d9f3f37420e88e291";
    const TOKEN0_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // USDC
    const TOKEN1_ADDRESS = "0xa411c9Aa00E020e4f88Bc19996d29c5B7ADB4ACf"; // XOC

    // Use 1 USDC (8 decimals) as amount in
    const AMOUNT_IN = BigInt(10 ** 8);

    // Only fetch the spot price
    const fetchSpot = await viemClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: lpManagerAbi,
      functionName: 'fetchSpot',
      args: [TOKEN0_ADDRESS, TOKEN1_ADDRESS, AMOUNT_IN],
    });

    // Insert into Supabase
    const { error } = await supabase
      .from('price_history')
      .insert({ fetch_spot: fetchSpot.toString() }); // timestamp auto-set

    if (error) throw error;
    console.log(`✅ Stored fetch_spot: ${fetchSpot.toString()}`);
  } catch (err) {
    console.error('Error indexing spot price:', err);
  }
}

// Run once if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  indexSpotPrice();
}
