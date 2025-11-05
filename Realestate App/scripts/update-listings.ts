/**
 * Daily Listings Update Script
 *
 * Fetches new listings from Bright Data and adds them to your database.
 * Run this daily via cron job to keep your data fresh.
 *
 * Usage: npx ts-node scripts/update-listings.ts
 * Cron: 0 6 * * * cd /path/to/app && npx ts-node scripts/update-listings.ts
 */

import { PrismaClient } from '@prisma/client';
import { brightDataService } from '../src/services/brightDataService';

const prisma = new PrismaClient();

// Configure your target cities
const TARGET_CITIES = [
  { city: 'Austin', state: 'TX' },
  { city: 'Houston', state: 'TX' },
  { city: 'Dallas', state: 'TX' },
  { city: 'San Antonio', state: 'TX' },
  // Add more cities as needed
];

async function updateListings() {
  console.log('🔄 Daily Listings Update');
  console.log('='.repeat(50));
  console.log(`Started: ${new Date().toLocaleString()}\n`);

  let totalAdded = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  try {
    for (const location of TARGET_CITIES) {
      console.log(`📍 Updating ${location.city}, ${location.state}...`);

      try {
        // Fetch new listings from last 24 hours
        const listings = await brightDataService.searchProperties({
          city: location.city,
          state: location.state,
        });

        console.log(`   Found ${listings.length} listings`);

        // Process each listing
        for (const listing of listings) {
          try {
            // Check if property already exists
            const existing = await prisma.property.findFirst({
              where: {
                OR: [
                  { externalId: listing.externalId },
                  {
                    AND: [
                      { address: listing.address },
                      { city: listing.city },
                      { zipCode: listing.zipCode },
                    ],
                  },
                ],
              },
            });

            if (existing) {
              // Update existing property
              await prisma.property.update({
                where: { id: existing.id },
                data: {
                  currentValue: listing.currentValue,
                  status: listing.status,
                  updatedAt: new Date(),
                },
              });
              totalUpdated++;
            } else {
              // Create new property
              await prisma.property.create({
                data: {
                  address: listing.address,
                  city: listing.city,
                  state: listing.state,
                  zipCode: listing.zipCode || '',
                  latitude: listing.latitude,
                  longitude: listing.longitude,
                  propertyType: listing.propertyType,
                  bedrooms: listing.bedrooms,
                  bathrooms: listing.bathrooms,
                  squareFeet: listing.squareFeet,
                  lotSize: listing.lotSize,
                  yearBuilt: listing.yearBuilt,
                  purchasePrice: listing.purchasePrice,
                  currentValue: listing.currentValue,
                  status: listing.status,
                  source: listing.source,
                  externalId: listing.externalId,
                  sourceUrl: listing.sourceUrl,
                },
              });
              totalAdded++;
            }
          } catch (propertyError: any) {
            console.error(`   ⚠️  Error processing property: ${propertyError.message}`);
            totalSkipped++;
          }
        }

        console.log(`   ✅ Processed ${listings.length} listings\n`);

        // Rate limiting - wait 1 second between cities
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (cityError: any) {
        console.error(`   ❌ Error updating ${location.city}: ${cityError.message}\n`);
      }
    }

    // Summary
    console.log('='.repeat(50));
    console.log('📊 Update Summary:');
    console.log('='.repeat(50));
    console.log(`✅ New listings added: ${totalAdded}`);
    console.log(`🔄 Existing updated: ${totalUpdated}`);
    console.log(`⏭️  Skipped (errors): ${totalSkipped}`);
    console.log(`📅 Completed: ${new Date().toLocaleString()}`);
    console.log('='.repeat(50));

    // Log to database (optional - for tracking update history)
    await prisma.$executeRaw`
      INSERT INTO "UpdateLog" (type, count, created_at)
      VALUES ('daily_update', ${totalAdded}, NOW())
      ON CONFLICT DO NOTHING;
    `;

  } catch (error: any) {
    console.error('\n❌ Update Failed:');
    console.error(error.message);

    // Send alert (implement email/SMS notification here)
    console.log('\n⚠️  Consider setting up alerts for failed updates');

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updateListings()
  .then(() => {
    console.log('\n✅ Daily update complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
