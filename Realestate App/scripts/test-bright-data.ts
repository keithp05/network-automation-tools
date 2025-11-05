/**
 * Test Bright Data Connection
 * Run: npx ts-node scripts/test-bright-data.ts
 */

import { brightDataService } from '../src/services/brightDataService';

async function testBrightData() {
  console.log('🧪 Testing Bright Data Connection...\n');

  try {
    // Test 1: List available datasets
    console.log('📊 Test 1: Fetching available datasets...');
    const datasets = await brightDataService.listDatasets();

    if (datasets && datasets.length > 0) {
      console.log(`✅ Found ${datasets.length} datasets available`);
      console.log('Available datasets:', datasets.slice(0, 3).map(d => d.name || d.id));
    } else {
      console.log('⚠️  No datasets found (may need to check API token)');
    }

    // Test 2: Search properties (if API token is valid)
    console.log('\n📍 Test 2: Searching properties in Austin, TX...');
    const properties = await brightDataService.searchProperties({
      city: 'Austin',
      state: 'TX',
      minPrice: 300000,
      maxPrice: 500000,
    });

    if (properties && properties.length > 0) {
      console.log(`✅ Found ${properties.length} properties!`);
      console.log('\nSample property:');
      console.log(JSON.stringify(properties[0], null, 2));
    } else {
      console.log('ℹ️  No properties returned (this may be normal if dataset needs to be triggered first)');
    }

  } catch (error: any) {
    console.error('\n❌ Error testing Bright Data:');
    console.error(error.message);

    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    }

    console.log('\n💡 Troubleshooting:');
    console.log('1. Make sure your API token is correct in .env');
    console.log('2. Verify you have access to datasets in Bright Data dashboard');
    console.log('3. You may need to purchase a dataset first');
    console.log('4. Try the 7-day free trial: https://brightdata.com/');
  }

  console.log('\n' + '='.repeat(50));
  console.log('📖 Next Steps:');
  console.log('='.repeat(50));
  console.log('');
  console.log('If API key is valid:');
  console.log('  ✅ You\'re ready to use Bright Data!');
  console.log('');
  console.log('If you see errors:');
  console.log('  1. Sign up at https://brightdata.com/');
  console.log('  2. Get your API token from the dashboard');
  console.log('  3. Add it to .env as BRIGHT_DATA_API_TOKEN');
  console.log('  4. Optionally purchase a dataset ($250 for 100K records)');
  console.log('');
  console.log('For FREE testing:');
  console.log('  - Use County Records + Craigslist (no API keys needed)');
  console.log('  - Run: npm run dev');
  console.log('');
}

testBrightData()
  .then(() => console.log('✅ Test complete!'))
  .catch(error => console.error('Test failed:', error));
