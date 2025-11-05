# Bright Data Setup Guide 🌟

## Why Bright Data is BETTER for Your Budget

### 💰 Cost Comparison

| Approach | Monthly Cost | What You Get |
|----------|-------------|--------------|
| **RapidAPI** | $10-50 | ~1K-10K API calls, rate limited |
| **Bright Data Dataset** | $250 one-time | 100K pre-scraped records (Zillow, Realtor, MLS) |
| **Bright Data API** | ~$7.50 | 10K requests with proxy rotation |

**Winner:** Bright Data datasets - Pay once, use forever!

---

## 🎯 What You Get from Bright Data

### Pre-built Datasets Available:

1. **Zillow Dataset** - 134M+ listings
   - Active listings
   - Sold properties
   - Off-market estimates
   - Property history
   - Photos and details

2. **Realtor.com / MLS Dataset**
   - Official MLS data
   - Agent information
   - Detailed property info
   - Market statistics

3. **Multi-source Real Estate**
   - Redfin
   - Trulia
   - Apartments.com
   - And more...

### Data Fields Included:

```json
{
  "zpid": "12345678",
  "address": "123 Main St",
  "city": "Austin",
  "state": "TX",
  "zip_code": "78701",
  "price": 450000,
  "bedrooms": 3,
  "bathrooms": 2,
  "square_feet": 2400,
  "lot_size": 8000,
  "year_built": 2015,
  "property_type": "Single Family",
  "listing_date": "2025-10-15",
  "days_on_market": 12,
  "price_per_sqft": 187.50,
  "hoa_fee": 150,
  "tax_amount": 8500,
  "images": ["url1", "url2", "url3"],
  "description": "Beautiful 3BR home...",
  "latitude": 30.2672,
  "longitude": -97.7431,
  "listing_url": "https://zillow.com/..."
}
```

---

## 🚀 Setup Instructions

### Step 1: Sign Up for Bright Data

1. Go to: https://brightdata.com/
2. Click "Start free trial" (7-day free trial)
3. Choose **"Dataset Marketplace"**
4. Select **"Real Estate"** category

### Step 2: Get API Token

```bash
# After signup:
1. Go to Dashboard
2. Navigate to "API Tokens"
3. Create new token
4. Copy token (starts with "Bearer_...")
```

### Step 3: Add to Environment

Edit your `.env` file:

```env
# Bright Data
BRIGHT_DATA_API_TOKEN="your-api-token-here"
BRIGHT_DATA_DATASET_ID="gd_lwh4f6i08oqu8aw1q5"  # Zillow dataset
```

### Step 4: Choose Your Approach

#### Option A: Buy Dataset Once (RECOMMENDED)

**Cost:** $250 for 100K records (one-time)

**Best for:** Getting massive data upfront, then using locally

```typescript
import { brightDataService } from '@/services/brightDataService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Download and import entire dataset into your database
async function setupDatabase() {
  const datasetId = 'gd_lwh4f6i08oqu8aw1q5'; // Zillow dataset

  const imported = await brightDataService.importDatasetToDatabase(
    datasetId,
    prisma
  );

  console.log(`✅ Imported ${imported} properties!`);

  // Now you have 100K properties in your database
  // No more API calls needed!
}

setupDatabase();
```

**After import:**
- Search your local database (FREE)
- Update weekly/monthly with fresh data
- No API rate limits

#### Option B: Use API for Real-Time Data

**Cost:** $0.75 per 1K requests

**Best for:** Always getting fresh listings

```typescript
import { brightDataService } from '@/services/brightDataService';

async function searchProperties() {
  const properties = await brightDataService.searchProperties({
    city: 'Austin',
    state: 'TX',
    minPrice: 300000,
    maxPrice: 600000,
    minBedrooms: 3
  });

  console.log(`Found ${properties.length} properties`);
  return properties;
}
```

#### Option C: Hybrid Approach (BEST VALUE!)

**Cost:** $250 one-time + $7.50/month for updates

1. **Initial:** Buy dataset, import 100K properties
2. **Daily:** Use API to get new listings (only ~10K requests/month)
3. **Result:** Fresh data at minimal cost!

```typescript
// Run once: Import bulk data
await brightDataService.importDatasetToDatabase(datasetId, prisma);

// Run daily: Get new listings from last 24 hours
const newListings = await brightDataService.searchProperties({
  city: 'Austin',
  state: 'TX',
  listedAfter: new Date(Date.now() - 24 * 60 * 60 * 1000)
});

// Add new listings to database
await prisma.property.createMany({
  data: newListings,
  skipDuplicates: true
});
```

---

## 📦 Integration with Existing App

Update your property aggregator:

```typescript
// src/services/propertyAggregator.ts

import { brightDataService } from './brightDataService';

export class PropertyAggregator {
  async searchProperties(params: PropertySearchParams): Promise<Property[]> {
    const results = await Promise.allSettled([
      // FREE sources
      countyRecordsScraper.searchByLocation(params.city, params.state),
      craigslistScraper.searchOwnerFinance(params.city, params.state),

      // Bright Data (best value!)
      brightDataService.searchProperties(params),

      // Optional: RapidAPI as backup
      // this.searchZillow(params),
      // this.searchRealtor(params),
    ]);

    // ... rest of code
  }
}
```

---

## 💡 Pricing Scenarios

### Scenario 1: Testing Phase
**Goal:** Test app with real data

**Approach:**
- Use 7-day free trial
- Download sample dataset (free)
- Test all features

**Cost:** $0

### Scenario 2: Small Scale
**Goal:** Launch MVP with 10K properties

**Approach:**
- Buy 10K records: $25 (one-time)
- Update monthly: $7.50/month

**Monthly:** ~$10

### Scenario 3: Medium Scale
**Goal:** Cover entire city (100K properties)

**Approach:**
- Buy 100K records: $250 (one-time)
- Daily updates (10K requests/month): $7.50/month

**Monthly:** ~$10 after initial $250

### Scenario 4: Production Scale
**Goal:** Multiple cities, always fresh data

**Approach:**
- Buy 500K records: $1,250 (one-time)
- Daily updates (50K requests/month): $37.50/month

**Monthly:** ~$40 after initial investment

---

## 🎓 Advanced Usage

### Bulk Import Script

Create `scripts/import-bright-data.ts`:

```typescript
import { brightDataService } from '../src/services/brightDataService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Bright Data import...');

  const datasetId = process.env.BRIGHT_DATA_DATASET_ID!;

  const count = await brightDataService.importDatasetToDatabase(
    datasetId,
    prisma
  );

  console.log(`✅ Successfully imported ${count} properties!`);

  // Create indexes for fast searching
  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS idx_city_state ON "Property"(city, state);
    CREATE INDEX IF NOT EXISTS idx_price ON "Property"(purchase_price);
    CREATE INDEX IF NOT EXISTS idx_bedrooms ON "Property"(bedrooms);
  `;

  console.log('✅ Indexes created!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Run it:
```bash
npx ts-node scripts/import-bright-data.ts
```

### Daily Update Cron Job

Create `scripts/update-listings.ts`:

```typescript
import { brightDataService } from '../src/services/brightDataService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateDailyListings() {
  const cities = ['Austin', 'Houston', 'Dallas']; // Your target cities

  for (const city of cities) {
    console.log(`Updating ${city}...`);

    const newListings = await brightDataService.searchProperties({
      city,
      state: 'TX',
      // Only get listings from last 24 hours
      listedAfter: new Date(Date.now() - 24 * 60 * 60 * 1000)
    });

    await prisma.property.createMany({
      data: newListings,
      skipDuplicates: true
    });

    console.log(`Added ${newListings.length} new listings for ${city}`);
  }
}

updateDailyListings()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Add to crontab:
```bash
# Run daily at 6 AM
0 6 * * * cd /path/to/app && npx ts-node scripts/update-listings.ts
```

---

## 📊 Data Freshness

### Update Frequencies Available:

- **Real-time:** API calls ($0.75/1K)
- **Daily:** Scheduled dataset refresh
- **Weekly:** Good for less competitive markets
- **Monthly:** Budget option

### Recommendation:

**Hybrid Strategy:**
1. **Initial:** Import 100K records ($250)
2. **Daily:** Fetch 500 new listings via API (~$0.38/day)
3. **Weekly:** Download fresh dataset if major changes
4. **Monthly cost:** ~$12 (after initial $250)

---

## 🆚 Final Comparison

### Your Options Now:

| Source | Setup Cost | Monthly Cost | Records | Fresh Data |
|--------|-----------|--------------|---------|------------|
| **FREE (County + Craigslist)** | $0 | $0 | 20-100 | Weekly |
| **RapidAPI** | $0 | $20-50 | 2K-10K | Real-time |
| **Bright Data (Dataset)** | $250 | $0 | 100K | One-time |
| **Bright Data (Hybrid)** | $250 | $10 | 100K+ | Daily |

### 🏆 BEST APPROACH:

**Phase 1: Testing (FREE)**
- Use County + Craigslist scrapers
- 7-day Bright Data trial
- Cost: $0

**Phase 2: Launch ($250)**
- Buy 100K Bright Data records
- Import to database
- Search locally (FREE)
- Cost: $250 one-time

**Phase 3: Production ($10/month)**
- Daily API updates (500 new listings)
- Keep data fresh
- Cost: ~$10/month

**Total first year:** $250 + ($10 × 12) = $370
**Per property cost:** $0.00037 (practically free!)

---

## 🚀 Quick Start

```bash
# 1. Sign up for Bright Data
# Visit: https://brightdata.com/products/datasets/real-estate

# 2. Add API token to .env
echo 'BRIGHT_DATA_API_TOKEN="your-token"' >> .env

# 3. Test the connection
npm run dev

# 4. (Optional) Import dataset
npx ts-node scripts/import-bright-data.ts

# 5. Start searching!
```

---

## ✅ Summary

**Bright Data is PERFECT for your use case because:**

1. ✅ **Cheaper long-term** - One-time $250 vs $20/month forever
2. ✅ **More data** - 100K records vs 1K-10K with RapidAPI
3. ✅ **No rate limits** - Use dataset locally
4. ✅ **Better quality** - Official scraped data from Zillow/MLS
5. ✅ **Flexible** - Buy once, or subscribe for updates
6. ✅ **Multiple sources** - Zillow, Realtor, MLS, Redfin all included

**Recommended setup:**
- Initial: $250 for 100K records
- Ongoing: $10/month for fresh data
- Total year 1: ~$370 (vs $600+ with RapidAPI)

**You now have 3 data strategies:**
1. FREE - County + Craigslist
2. Budget - Bright Data dataset
3. Premium - Bright Data hybrid with daily updates

Choose what fits your needs! 🎉
