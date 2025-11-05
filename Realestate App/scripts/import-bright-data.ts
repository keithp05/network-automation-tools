/**
 * Import Bright Data Dataset to Database
 *
 * This script downloads a Bright Data dataset and imports it into your PostgreSQL database.
 * Run after purchasing a dataset ($250 for 100K records)
 *
 * Usage: npx ts-node scripts/import-bright-data.ts
 */

import { PrismaClient } from '@prisma/client';
import { brightDataService } from '../src/services/brightDataService';

const prisma = new PrismaClient();

async function importDataset() {
  console.log('🚀 Bright Data Dataset Import\n');
  console.log('='.repeat(50));

  try {
    // Get dataset ID from environment
    const datasetId = process.env.BRIGHT_DATA_DATASET_ID;

    if (!datasetId) {
      throw new Error('BRIGHT_DATA_DATASET_ID not found in .env');
    }

    console.log(`📦 Dataset ID: ${datasetId}`);
    console.log(`🗄️  Database: ${process.env.DATABASE_URL?.split('@')[1] || 'Not configured'}`);
    console.log('='.repeat(50));
    console.log('');

    // Confirm before proceeding
    console.log('⚠️  This will download and import the dataset.');
    console.log('   Depending on size, this may take 5-30 minutes.');
    console.log('');

    // Import the dataset
    console.log('📥 Starting import...\n');

    const count = await brightDataService.importDatasetToDatabase(
      datasetId,
      prisma
    );

    console.log('\n' + '='.repeat(50));
    console.log(`✅ SUCCESS! Imported ${count.toLocaleString()} properties`);
    console.log('='.repeat(50));
    console.log('');

    // Create indexes for performance
    console.log('🔧 Creating database indexes...');

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_property_city_state
      ON "Property"(city, state);
    `;

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_property_price
      ON "Property"("purchasePrice");
    `;

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_property_bedrooms
      ON "Property"(bedrooms);
    `;

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_property_source
      ON "Property"(source);
    `;

    console.log('✅ Indexes created!\n');

    // Get statistics
    const stats = await prisma.$queryRaw<any[]>`
      SELECT
        COUNT(*) as total,
        COUNT(DISTINCT city) as cities,
        COUNT(DISTINCT state) as states,
        AVG("purchasePrice") as avg_price,
        MIN("purchasePrice") as min_price,
        MAX("purchasePrice") as max_price
      FROM "Property"
      WHERE source = 'bright-data'
    `;

    console.log('📊 Database Statistics:');
    console.log('='.repeat(50));
    console.log(`Total Properties: ${parseInt(stats[0].total).toLocaleString()}`);
    console.log(`Cities Covered: ${stats[0].cities}`);
    console.log(`States Covered: ${stats[0].states}`);
    console.log(`Average Price: $${parseInt(stats[0].avg_price).toLocaleString()}`);
    console.log(`Price Range: $${parseInt(stats[0].min_price).toLocaleString()} - $${parseInt(stats[0].max_price).toLocaleString()}`);
    console.log('='.repeat(50));
    console.log('');

    console.log('🎉 Import Complete!\n');
    console.log('Next steps:');
    console.log('  1. Run: npm run dev');
    console.log('  2. Visit: http://localhost:3000/properties/search');
    console.log('  3. Start searching your local database!');
    console.log('');
    console.log('💡 Tip: Set up daily updates with scripts/update-listings.ts');
    console.log('');

  } catch (error: any) {
    console.error('\n❌ Import Failed:');
    console.error(error.message);

    if (error.response) {
      console.error('\nAPI Response:');
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }

    console.log('\n💡 Troubleshooting:');
    console.log('1. Verify your Bright Data API token is correct');
    console.log('2. Make sure you have purchased the dataset');
    console.log('3. Check your dataset ID in .env');
    console.log('4. Ensure PostgreSQL is running and accessible');
    console.log('5. Run: npx prisma db push (to ensure schema is up to date)');
    console.log('');

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importDataset()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
