# 🏗️ Real Estate Platform - Architecture & Data Flow

## 🎯 Architecture Options

You have **3 deployment architectures** to choose from, depending on your scale and budget.

---

## Option 1: Monolith on Single Server (RECOMMENDED for MVP)

**Best for:** Testing, MVP, small-scale (<10K users)
**Cost:** $12-30/month
**Complexity:** Low ⭐

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    AWS Lightsail                        │
│                     ($12/month)                         │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │            Next.js Application                    │  │
│  │  ┌────────────────────────────────────────────┐  │  │
│  │  │  Frontend (React)                          │  │  │
│  │  │  - Property Search UI                      │  │  │
│  │  │  - Dashboard                               │  │  │
│  │  │  - Tenant Portal                           │  │  │
│  │  └────────────────────────────────────────────┘  │  │
│  │                     ↕                            │  │
│  │  ┌────────────────────────────────────────────┐  │  │
│  │  │  API Routes (Next.js)                      │  │  │
│  │  │  - /api/properties/search                  │  │  │
│  │  │  - /api/analysis/cma                       │  │  │
│  │  │  - /api/crime                              │  │  │
│  │  └────────────────────────────────────────────┘  │  │
│  │                     ↕                            │  │
│  │  ┌────────────────────────────────────────────┐  │  │
│  │  │  Services Layer                            │  │  │
│  │  │  - propertyAggregator                      │  │  │
│  │  │  - brightDataService                       │  │  │
│  │  │  - countyRecordsScraper                    │  │  │
│  │  │  - craigslistScraper                       │  │  │
│  │  │  - crimeDataService                        │  │  │
│  │  └────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────┘  │
│                     ↕                                   │
│  ┌──────────────────────────────────────────────────┐  │
│  │  PostgreSQL Database (local)                     │  │
│  │  - Properties (100K+ records)                    │  │
│  │  - Users, Tenants, Leases                        │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                         ↕
           ┌─────────────────────────────┐
           │   External APIs              │
           ├─────────────────────────────┤
           │ Bright Data                 │
           │ OpenAI GPT-4                │
           │ SpotCrime                   │
           └─────────────────────────────┘
```

### Pros
✅ Simple to deploy
✅ Low cost ($12-30/month)
✅ Easy to manage
✅ Fast development

### Cons
❌ Single point of failure
❌ Limited scalability
❌ Manual scaling needed

---

## Option 2: Microservices on AWS (Scalable Production)

**Best for:** Production, scaling to 100K+ users
**Cost:** $100-300/month
**Complexity:** Medium ⭐⭐⭐

### Architecture Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                         AWS Cloud                              │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │              CloudFront CDN                              │ │
│  │         (Global edge caching)                            │ │
│  └─────────────────────┬────────────────────────────────────┘ │
│                        ↓                                       │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │         Application Load Balancer (ALB)                  │ │
│  └─────────────────────┬────────────────────────────────────┘ │
│                        ↓                                       │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              Auto Scaling Group                         │  │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐          │  │
│  │  │ EC2       │  │ EC2       │  │ EC2       │          │  │
│  │  │ Frontend  │  │ Frontend  │  │ Frontend  │          │  │
│  │  │ (Next.js) │  │ (Next.js) │  │ (Next.js) │  ...     │  │
│  │  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘          │  │
│  └────────┼──────────────┼──────────────┼────────────────┘  │
│           └──────────────┴──────────────┘                    │
│                        ↓                                      │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Microservices (ECS/Fargate)                │ │
│  │  ┌────────────────┐  ┌────────────────┐               │ │
│  │  │ Property       │  │ Crime Data     │               │ │
│  │  │ Service        │  │ Service        │               │ │
│  │  │ (Node.js)      │  │ (Node.js)      │               │ │
│  │  └────────────────┘  └────────────────┘               │ │
│  │  ┌────────────────┐  ┌────────────────┐               │ │
│  │  │ Analysis       │  │ Scraper        │               │ │
│  │  │ Service        │  │ Service        │               │ │
│  │  │ (Python/Node)  │  │ (Node.js)      │               │ │
│  │  └────────────────┘  └────────────────┘               │ │
│  └─────────────────────────────────────────────────────────┘ │
│                        ↓                                      │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                   Data Layer                            │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │ │
│  │  │ RDS          │  │ ElastiCache  │  │ S3           │ │ │
│  │  │ PostgreSQL   │  │ (Redis)      │  │ (Images)     │ │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
│                        ↓                                      │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Background Jobs (SQS + Lambda)             │ │
│  │  - Daily property updates                               │ │
│  │  - Data scraping jobs                                   │ │
│  │  - Email notifications                                  │ │
│  └─────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
                         ↕
           ┌─────────────────────────────┐
           │   External APIs              │
           ├─────────────────────────────┤
           │ Bright Data API             │
           │ OpenAI GPT-4                │
           │ SpotCrime                   │
           │ County Websites             │
           └─────────────────────────────┘
```

### Microservices Breakdown

#### 1. **Property Service** (ECS Container)
```typescript
Responsibilities:
- Property search aggregation
- CRUD operations
- Data deduplication
- Source tracking

APIs:
- POST /api/properties/search
- GET /api/properties/:id
- PUT /api/properties/:id
- DELETE /api/properties/:id

Database: PostgreSQL (RDS)
Cache: Redis (ElastiCache)
```

#### 2. **Scraper Service** (ECS Container)
```typescript
Responsibilities:
- Bright Data integration
- County records scraping
- Craigslist scraping
- Data normalization

APIs:
- POST /scraper/bright-data
- POST /scraper/county-records
- POST /scraper/craigslist

Queue: SQS (for async jobs)
```

#### 3. **Analysis Service** (ECS Container)
```typescript
Responsibilities:
- AI-powered CMA
- Rental rate estimation
- ROI calculations
- Market trends

APIs:
- POST /analysis/cma
- POST /analysis/rental-rate
- POST /analysis/roi

External: OpenAI GPT-4
Cache: Redis (expensive API calls)
```

#### 4. **Crime Data Service** (ECS Container)
```typescript
Responsibilities:
- Crime data aggregation
- Safety scoring
- Trend analysis

APIs:
- GET /crime/:location
- GET /crime/score/:address

External: SpotCrime, FBI API
Cache: Redis (1 week TTL)
```

#### 5. **Background Jobs** (Lambda Functions)
```typescript
Functions:
- dailyPropertyUpdate() - Runs at 6 AM
- weeklyScrape() - County records
- dataCleanup() - Remove stale listings
- emailNotifications() - New listings alerts

Trigger: CloudWatch Events (cron)
Queue: SQS
```

### Pros
✅ Highly scalable
✅ Independent service scaling
✅ Fault isolation
✅ Better performance
✅ Team can work independently on services

### Cons
❌ Higher cost ($100-300/month)
❌ Complex deployment
❌ More monitoring required
❌ Longer development time

---

## Option 3: Serverless (AWS Lambda + API Gateway)

**Best for:** Variable traffic, cost optimization
**Cost:** $20-100/month (pay per use)
**Complexity:** Medium ⭐⭐

### Architecture Diagram

```
┌────────────────────────────────────────────────────────────┐
│                    AWS Serverless                          │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │           CloudFront + S3 (Static Frontend)          │ │
│  │        (Next.js exported as static site)             │ │
│  └─────────────────────┬────────────────────────────────┘ │
│                        ↓                                   │
│  ┌──────────────────────────────────────────────────────┐ │
│  │              API Gateway (REST)                      │ │
│  └─────────────────────┬────────────────────────────────┘ │
│                        ↓                                   │
│  ┌─────────────────────────────────────────────────────┐  │
│  │           Lambda Functions                          │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐         │  │
│  │  │ search   │  │ analyze  │  │ crime    │         │  │
│  │  │ Property │  │ Property │  │ Data     │  ...    │  │
│  │  └──────────┘  └──────────┘  └──────────┘         │  │
│  └─────────────────────────────────────────────────────┘  │
│                        ↓                                   │
│  ┌─────────────────────────────────────────────────────┐  │
│  │            Aurora Serverless v2                     │  │
│  │        (PostgreSQL - auto-scaling)                  │  │
│  └─────────────────────────────────────────────────────┘  │
│                        ↓                                   │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              EventBridge (Scheduler)                │  │
│  │  - Daily updates (6 AM)                             │  │
│  │  - Weekly scraping                                  │  │
│  │  - Cleanup jobs                                     │  │
│  └─────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

### Lambda Functions

```typescript
// searchProperties.ts
export const handler = async (event) => {
  const { city, state, minPrice, maxPrice } = JSON.parse(event.body);

  const results = await propertyAggregator.searchProperties({
    city, state, minPrice, maxPrice
  });

  return {
    statusCode: 200,
    body: JSON.stringify(results)
  };
};

// dailyUpdate.ts (EventBridge scheduled)
export const handler = async () => {
  const newListings = await brightDataService.searchProperties({...});
  await prisma.property.createMany({ data: newListings });
};
```

### Pros
✅ Pay only for usage
✅ Auto-scaling
✅ No server management
✅ Cost-effective for variable traffic

### Cons
❌ Cold starts (slower first request)
❌ 15-minute timeout limit
❌ Complex local development
❌ Vendor lock-in

---

## 📊 Data Flow Architecture

### Property Search Flow

```
User Request
    ↓
┌───────────────────────────────────────────┐
│ 1. Frontend (Next.js)                     │
│    - User enters search criteria          │
│    - City, state, price range, beds       │
└───────────────┬───────────────────────────┘
                ↓
┌───────────────────────────────────────────┐
│ 2. API Route (/api/properties/search)    │
│    - Validates input                      │
│    - Checks cache (Redis)                 │
└───────────────┬───────────────────────────┘
                ↓
         Cache Hit? ───Yes─→ Return cached results
                │
                No
                ↓
┌───────────────────────────────────────────┐
│ 3. Property Aggregator Service            │
│    - Orchestrates multiple sources        │
└───────────────┬───────────────────────────┘
                ↓
        ┌───────┴────────┬──────────┬───────────┐
        ↓                ↓          ↓           ↓
┌──────────────┐ ┌─────────────┐ ┌──────────┐ ┌──────────┐
│ Local DB     │ │ Bright Data │ │ County   │ │Craigslist│
│ (PostgreSQL) │ │ API         │ │ Records  │ │          │
└──────┬───────┘ └──────┬──────┘ └────┬─────┘ └────┬─────┘
       │                │              │            │
       └────────────────┴──────────────┴────────────┘
                        ↓
┌───────────────────────────────────────────┐
│ 4. Data Normalization                     │
│    - Convert to standard Property format  │
│    - Deduplicate across sources           │
│    - Enrich with metadata                 │
└───────────────┬───────────────────────────┘
                ↓
┌───────────────────────────────────────────┐
│ 5. Cache Results (Redis - 1 hour)        │
└───────────────┬───────────────────────────┘
                ↓
┌───────────────────────────────────────────┐
│ 6. Return to Frontend                     │
│    - Display properties                   │
│    - Show source attribution              │
└───────────────────────────────────────────┘
```

### Daily Update Flow (Background Job)

```
CloudWatch Event (6 AM daily)
            ↓
┌───────────────────────────────────────────┐
│ Lambda/Cron triggers update script        │
└───────────────┬───────────────────────────┘
                ↓
┌───────────────────────────────────────────┐
│ For each target city:                     │
│  - Austin, Houston, Dallas, etc.          │
└───────────────┬───────────────────────────┘
                ↓
┌───────────────────────────────────────────┐
│ Bright Data API                           │
│  - Fetch listings from last 24 hours      │
│  - ~500 new listings per city             │
└───────────────┬───────────────────────────┘
                ↓
┌───────────────────────────────────────────┐
│ Check if property exists in DB            │
│  - Query by externalId or address         │
└───────────────┬───────────────────────────┘
                ↓
        ┌───────┴────────┐
        ↓                ↓
┌──────────────┐  ┌──────────────┐
│ New Property │  │ Update Price │
│ → INSERT     │  │ → UPDATE     │
└──────┬───────┘  └──────┬───────┘
       └──────────────────┘
                ↓
┌───────────────────────────────────────────┐
│ Send notifications (optional)             │
│  - Email new listings to users            │
│  - Price drop alerts                      │
└───────────────────────────────────────────┘
```

---

## 🎯 Recommended Architecture by Stage

### Stage 1: MVP (Months 1-3)
**Use:** Monolith on Lightsail

```typescript
// Single server deployment
- Next.js app (frontend + API)
- PostgreSQL (local)
- PM2 (process manager)
- Nginx (reverse proxy)
- Cost: $12-30/month
```

### Stage 2: Growth (Months 4-12)
**Use:** Monolith on EC2 + RDS

```typescript
// Separated database
- EC2 t3.small (app server)
- RDS PostgreSQL (managed database)
- ElastiCache Redis (caching)
- Cost: $50-100/month
```

### Stage 3: Scale (Year 2+)
**Use:** Microservices

```typescript
// Full microservices
- ECS/Fargate containers
- Multiple specialized services
- Auto-scaling
- Load balancing
- Cost: $100-300/month
```

---

## 💾 Database Schema & Scaling

### Tables

```sql
-- Core tables
Properties (100K+ rows)
Users (10K+ rows)
Tenants (5K+ rows)
Leases (5K+ rows)
MaintenanceRequests (20K+ rows)

-- Cache/Reports
CMAReports (1K+ rows)
CrimeReports (10K+ rows)
```

### Indexing Strategy

```sql
-- High-performance indexes
CREATE INDEX idx_properties_city_state ON properties(city, state);
CREATE INDEX idx_properties_price ON properties(purchase_price);
CREATE INDEX idx_properties_beds ON properties(bedrooms);
CREATE INDEX idx_properties_source ON properties(source);
CREATE INDEX idx_properties_created ON properties(created_at DESC);

-- Composite indexes for common queries
CREATE INDEX idx_properties_search
ON properties(city, state, purchase_price, bedrooms);
```

### Caching Strategy

```typescript
// Cache layers
1. Browser cache (images, static assets)
2. CDN cache (CloudFront)
3. Application cache (Redis)
   - Property searches: 1 hour TTL
   - CMA reports: 24 hours TTL
   - Crime data: 1 week TTL
4. Database cache (query results)
```

---

## 🔄 Data Sync Strategy

### Initial Load
```bash
# One-time import (100K records)
npx ts-node scripts/import-bright-data.ts
# Time: 10-30 minutes
# Cost: $250 (dataset purchase)
```

### Daily Updates
```bash
# Cron: 0 6 * * *
npx ts-node scripts/update-listings.ts
# Updates: ~500 new listings/day
# Cost: ~$0.38/day ($11/month)
```

### Real-time Fallback
```typescript
// If property not in DB, fetch from API
if (!cachedProperty) {
  property = await brightDataService.searchProperties({...});
  await cache.set(key, property, '1h');
}
```

---

## 📈 Scaling Milestones

| Users | Architecture | Database | Cost/Month |
|-------|-------------|----------|------------|
| 0-100 | Lightsail Monolith | PostgreSQL (local) | $12 |
| 100-1K | EC2 + RDS | PostgreSQL (t3.micro) | $50 |
| 1K-10K | EC2 + RDS + Cache | + ElastiCache | $100 |
| 10K-100K | Microservices + LB | Aurora + Read Replicas | $300 |
| 100K+ | Multi-region + CDN | Aurora Global + S3 | $1K+ |

---

## 🎯 Your Recommended Path

### Month 1-2: Start Simple
```
Architecture: Monolith on Lightsail
Database: Local PostgreSQL
Data: FREE sources (County + Craigslist)
Cost: $12/month
```

### Month 3: Add Data
```
Add: Bright Data ($250 dataset)
Import: 100K properties
Cost: $250 one-time + $12/month
```

### Month 4-6: Add Updates
```
Add: Daily updates script
Cron: 6 AM daily
Cost: $12 + $10 = $22/month
```

### Month 7-12: Scale Infrastructure
```
Move to: EC2 + RDS
Add: Redis cache
Add: Load balancer (if needed)
Cost: $50-100/month
```

**Total Year 1:** ~$400-500
**Much cheaper than building from scratch!**

---

## 📝 Summary

**For your use case, I recommend:**

1. **Start with Monolith** (Lightsail - $12/month)
2. **Use Bright Data dataset** ($250 one-time)
3. **Add daily updates** (+$10/month)
4. **Scale to microservices** when you hit 10K+ users

This gives you:
- ✅ Fast time to market
- ✅ Low initial cost
- ✅ Easy to manage
- ✅ Clear upgrade path

**Ready to deploy?** Follow the [AWS_DEPLOYMENT_GUIDE.md](AWS_DEPLOYMENT_GUIDE.md)!
