# Budget-Friendly Setup Guide 💰

Get your Real Estate Investor Platform running with **FREE and low-cost data sources**!

## 🎯 Quick Start (FREE Testing)

### Option 1: 100% FREE Mode
Test the app with **zero cost** using only free data sources:
- ✅ County public records (off-market properties)
- ✅ Craigslist (owner-finance deals)
- ✅ SpotCrime (crime data)

### Option 2: Budget Mode ($10-20/month)
Add premium property data while keeping costs low:
- ✅ Everything from FREE mode
- ✅ Zillow API (via RapidAPI ~$0.002/request)
- ✅ Realtor API (via RapidAPI ~$0.005/request)
- ✅ OpenAI GPT-4 for AI analysis (~$0.02/analysis)

---

## 📦 Installation

### 1. Install Dependencies
```bash
npm install
```

This will install:
- `cheerio` - For web scraping (FREE sources)
- `axios` - For API calls
- All other required packages

### 2. Set Up Environment Variables
```bash
cp .env.example .env
```

Edit `.env` and add your keys:

**For FREE Testing (no keys needed!):**
```env
# Just set a dummy database URL for testing
DATABASE_URL="postgresql://user:password@localhost:5432/realestate_investor"

# That's it! Free sources work without API keys
```

**For Budget Mode (optional):**
```env
# RapidAPI Keys (sign up at https://rapidapi.com/)
ZILLOW_API_KEY="your-rapidapi-key"  # ~$10/month
REALTOR_API_KEY="your-rapidapi-key"  # Same key works

# OpenAI for AI Analysis (https://platform.openai.com/)
OPENAI_API_KEY="sk-..."  # Pay-as-you-go
```

### 3. Initialize Database
```bash
npx prisma db push
```

### 4. Start Development Server
```bash
npm run dev
```

Visit: http://localhost:3000

---

## 💰 Cost Breakdown

### FREE Sources (No API Keys)

#### 1. **County Records Scraper** ✅
- **Cost:** FREE
- **What you get:** Off-market properties from public county assessor records
- **Supported counties:**
  - Travis County, TX (Austin)
  - Maricopa County, AZ (Phoenix)
  - Easy to add more counties!

**Example data:**
```javascript
{
  owner: "John Smith",
  address: "123 Main St",
  assessedValue: 350000,
  yearBuilt: 2015,
  sqft: 2400
}
```

#### 2. **Craigslist Scraper** ✅
- **Cost:** FREE
- **What you get:**
  - Owner-financed properties
  - FSBO (For Sale By Owner) listings
  - Off-market deals
- **Searches for:** "owner finance", "seller carry", "FSBO"

**Supported cities:** Austin, Houston, Dallas, Phoenix, LA, NYC, Chicago, Miami, Atlanta, Seattle, Denver, Portland, Vegas (easy to add more)

#### 3. **SpotCrime** ✅
- **Cost:** FREE (public scraping)
- **What you get:** Crime incidents by location
- **Data:** Crime type, date, severity, location

---

### Budget Sources ($10-20/month)

#### 1. **RapidAPI - Zillow & Realtor** 💵
- **Cost:** ~$10-20/month for testing
- **Sign up:** https://rapidapi.com/
- **Pricing:**
  - Zillow API: $0.002 per request (500 searches = $1)
  - Realtor API: $0.005 per request (200 searches = $1)
- **Free tier:** 100-500 requests/month

**Setup:**
1. Sign up at RapidAPI.com
2. Subscribe to:
   - "Zillow.com" API
   - "Realtor" API
3. Copy your RapidAPI key
4. Add to `.env` as `ZILLOW_API_KEY` and `REALTOR_API_KEY`

#### 2. **OpenAI GPT-4** 💵
- **Cost:** Pay-as-you-go
- **Pricing:**
  - CMA analysis: ~$0.02 each
  - Lease generation: ~$0.05 each
  - Rental estimation: ~$0.01 each
- **Sign up:** https://platform.openai.com/

**Setup:**
1. Create OpenAI account
2. Add payment method
3. Get API key from dashboard
4. Add to `.env` as `OPENAI_API_KEY`

---

## 🚀 Data Sources Available

### On-Market Properties
| Source | Cost | What You Get |
|--------|------|--------------|
| Zillow (RapidAPI) | $0.002/req | Active listings, photos, details |
| Realtor (RapidAPI) | $0.005/req | MLS data, agent info, history |

### Off-Market Properties (FREE!)
| Source | Cost | What You Get |
|--------|------|--------------|
| County Records | FREE | Owner info, assessed values, tax data |
| Craigslist | FREE | Owner-finance deals, FSBO, private sellers |

### Crime Data
| Source | Cost | What You Get |
|--------|------|--------------|
| SpotCrime | FREE | Crime incidents, severity, trends |
| FBI Crime Data | FREE | National crime statistics |

---

## 🎓 How to Use Free Sources

### Test Property Search (FREE)
```typescript
import { propertyAggregator } from '@/services/propertyAggregator';

// Search only FREE sources (no API keys needed)
const properties = await propertyAggregator.searchFreeSourcesOnly({
  city: 'Austin',
  state: 'TX',
  minPrice: 200000,
  maxPrice: 500000
});

// Returns:
// - County records (off-market)
// - Craigslist owner-finance deals
// - Craigslist FSBO listings
```

### Search All Sources (Budget Mode)
```typescript
// Searches both FREE and PAID sources
const properties = await propertyAggregator.searchProperties({
  city: 'Austin',
  state: 'TX',
  minPrice: 200000,
  maxPrice: 500000
});

// Returns everything from:
// - Zillow (if key present)
// - Realtor (if key present)
// - County records (always)
// - Craigslist (always)
```

---

## 📊 Expected Results

### FREE Mode (No API Keys)
- **County Records:** 10-50 properties per city
- **Craigslist:** 5-20 owner-finance deals
- **Total:** 15-70 properties per search

### Budget Mode (With API Keys)
- **Zillow:** 50-200 active listings
- **Realtor:** 50-200 MLS listings
- **County Records:** 10-50 off-market properties
- **Craigslist:** 5-20 owner-finance deals
- **Total:** 115-470 properties per search

---

## 🔧 Troubleshooting

### "No properties found"
- **County records:** Make sure your city is in a supported county
- **Craigslist:** Check that city name matches Craigslist subdomain
- **Add your city:** Edit `countyRecordsScraper.ts` and `craigslistScraper.ts`

### Rate limiting or blocking
If you get blocked by a source:
1. Add delays between requests
2. Use rotating user agents
3. Respect robots.txt
4. Consider using a proxy service

### Adding more counties
Edit `src/services/countyRecordsScraper.ts`:
```typescript
const COUNTY_CONFIGS = {
  'your-county-st': {
    name: 'YourCounty',
    state: 'ST',
    searchUrl: 'https://...',
    selectors: { ... }
  }
};
```

### Adding more cities (Craigslist)
Edit `src/services/craigslistScraper.ts`:
```typescript
const cityMap = {
  'your city': 'craigslistsubdomain',
};
```

---

## 💡 Pro Tips

### 1. Start with FREE sources
Test your app completely free before adding API keys.

### 2. County records are gold
Off-market properties from county records are where the best deals are found.

### 3. Monitor your API usage
- RapidAPI dashboard shows usage
- Set up billing alerts
- Cache results to reduce API calls

### 4. Owner-finance deals
Craigslist scraper finds properties with:
- "owner finance"
- "seller carry"
- "no bank financing"
- "flexible terms"

### 5. Expand gradually
Add more counties and cities as you need them.

---

## 📈 Scaling Up

### When you're ready to scale:

1. **Add more data sources:**
   - More counties
   - More Craigslist cities
   - Facebook Marketplace
   - FSBO websites

2. **Upgrade APIs:**
   - Higher RapidAPI tier
   - Direct MLS access (requires broker)
   - Premium crime data

3. **Add caching:**
   - Save API results to database
   - Refresh data daily
   - Reduce duplicate calls

4. **Background jobs:**
   - Automated daily scraping
   - Email alerts for new properties
   - Price change notifications

---

## 🎉 You're Ready!

Start with **100% FREE mode** to test everything, then add budget APIs when you're ready.

**Total cost to start:** $0
**Monthly cost (budget mode):** $10-20

### Quick Commands:
```bash
npm install          # Install dependencies
cp .env.example .env # Set up environment
npx prisma db push   # Initialize database
npm run dev          # Start the app
```

Visit http://localhost:3000 and start finding deals! 🏡
