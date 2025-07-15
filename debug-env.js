import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🔍 Environment Variables Debug');
console.log('==============================');

const requiredVars = [
  'SUPABASE_URL',
  'SUPABASE_KEY', 
  'RPC_URL',
  'CONTRACT_ADDRESS',
  'CHAIN_ID'
];

console.log('\nRequired Variables:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅ Set' : '❌ Missing';
  const displayValue = value ? `${value.substring(0, 20)}...` : 'undefined';
  console.log(`${status} ${varName}: ${displayValue}`);
});

console.log('\nAll Environment Variables:');
Object.keys(process.env).forEach(key => {
  if (key.includes('SUPABASE') || key.includes('RPC') || key.includes('CONTRACT') || key.includes('CHAIN')) {
    console.log(`${key}: ${process.env[key] ? 'Set' : 'Missing'}`);
  }
});

console.log('\n✅ Debug complete'); 