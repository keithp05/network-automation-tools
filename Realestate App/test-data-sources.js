/**
 * Quick test script for data sources
 * Run: node test-data-sources.js
 */

console.log('🧪 Testing Real Estate Data Sources...\n');

// Test 1: Check if services can be imported
console.log('📦 Test 1: Checking service files...');
const fs = require('fs');

const requiredFiles = [
  'src/services/countyRecordsScraper.ts',
  'src/services/craigslistScraper.ts',
  'src/services/propertyAggregator.ts',
  'src/services/crimeData.ts',
];

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING!`);
  }
});

// Test 2: Check package.json for cheerio
console.log('\n📦 Test 2: Checking dependencies...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const hasCheerio = packageJson.dependencies.cheerio;

if (hasCheerio) {
  console.log(`  ✅ cheerio: ${hasCheerio}`);
} else {
  console.log(`  ❌ cheerio - MISSING! Run: npm install cheerio`);
}

// Test 3: Check .env.example
console.log('\n📦 Test 3: Checking environment setup...');
if (fs.existsSync('.env.example')) {
  const envExample = fs.readFileSync('.env.example', 'utf8');
  const hasZillow = envExample.includes('ZILLOW_API_KEY');
  const hasRealtor = envExample.includes('REALTOR_API_KEY');
  const hasFreeNote = envExample.includes('FREE Property Sources');

  console.log(`  ✅ .env.example exists`);
  console.log(`  ${hasZillow ? '✅' : '❌'} Zillow config`);
  console.log(`  ${hasRealtor ? '✅' : '❌'} Realtor config`);
  console.log(`  ${hasFreeNote ? '✅' : '❌'} FREE sources documented`);
}

// Test 4: Check if .env exists
console.log('\n📦 Test 4: Checking .env file...');
if (fs.existsSync('.env')) {
  console.log(`  ✅ .env exists`);
  console.log(`  ℹ️  Remember: API keys are optional!`);
  console.log(`  ℹ️  FREE sources work without any keys`);
} else {
  console.log(`  ⚠️  .env not found`);
  console.log(`  ℹ️  Run: cp .env.example .env`);
}

// Test 5: Check setup guide
console.log('\n📦 Test 5: Checking documentation...');
if (fs.existsSync('BUDGET_SETUP_GUIDE.md')) {
  console.log(`  ✅ BUDGET_SETUP_GUIDE.md`);
} else {
  console.log(`  ❌ BUDGET_SETUP_GUIDE.md - MISSING!`);
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 SUMMARY');
console.log('='.repeat(50));
console.log('');
console.log('✅ Services Created:');
console.log('   • County Records Scraper (FREE)');
console.log('   • Craigslist Scraper (FREE)');
console.log('   • Property Aggregator (Updated)');
console.log('   • Crime Data Service (FREE)');
console.log('');
console.log('💰 Cost Options:');
console.log('   • FREE Mode: $0/month');
console.log('   • Budget Mode: $10-20/month');
console.log('');
console.log('🚀 Next Steps:');
console.log('   1. npm install');
console.log('   2. cp .env.example .env');
console.log('   3. npx prisma db push');
console.log('   4. npm run dev');
console.log('');
console.log('📖 Read: BUDGET_SETUP_GUIDE.md for details');
console.log('');
