# Scripts Directory 📜

Utility scripts for managing your Real Estate Investor Platform data.

## 🚀 Available Scripts

### 1. Test Bright Data Connection
**File:** `test-bright-data.ts`

Test your Bright Data API connection and verify access to datasets.

```bash
npx ts-node scripts/test-bright-data.ts
```

**What it does:**
- ✅ Verifies API token is valid
- ✅ Lists available datasets
- ✅ Tests property search
- ✅ Shows sample data

**When to use:**
- After setting up Bright Data for the first time
- To verify your API token is working
- To check if you have access to datasets

---

### 2. Import Bright Data Dataset
**File:** `import-bright-data.ts`

One-time import of full Bright Data dataset into your PostgreSQL database.

```bash
npx ts-node scripts/import-bright-data.ts
```

**What it does:**
- 📥 Downloads 100K records from Bright Data
- 💾 Imports into your database
- 🔧 Creates performance indexes
- 📊 Shows import statistics

**When to use:**
- After purchasing a Bright Data dataset ($250 for 100K records)
- First-time setup
- To rebuild your database from scratch

**Time:** 5-30 minutes depending on dataset size

**Cost:** Uses your purchased dataset (one-time)

---

### 3. Daily Listings Update
**File:** `update-listings.ts`

Daily update script to fetch new listings and keep your database fresh.

```bash
npx ts-node scripts/update-listings.ts
```

**What it does:**
- 🔄 Fetches new listings from last 24 hours
- ➕ Adds new properties to database
- 🔄 Updates existing property prices
- 📊 Shows update summary

**When to use:**
- Run daily via cron job
- After initial dataset import
- To keep your data fresh

**Cost:** ~$0.75 per 1K requests (typically $0.38/day for 500 listings)

**Setup as cron job:**
```bash
# Edit crontab
crontab -e

# Add this line (runs daily at 6 AM)
0 6 * * * cd /path/to/realestate-app && npx ts-node scripts/update-listings.ts >> /var/log/property-updates.log 2>&1
```

---

## 📋 Typical Workflow

### First-Time Setup

1. **Test Connection**
   ```bash
   npx ts-node scripts/test-bright-data.ts
   ```
   Verify your API key works.

2. **Import Dataset** (if you purchased one)
   ```bash
   npx ts-node scripts/import-bright-data.ts
   ```
   This will take 5-30 minutes. ☕

3. **Set Up Daily Updates**
   ```bash
   # Test the update script first
   npx ts-node scripts/update-listings.ts

   # Then add to cron
   crontab -e
   # Add: 0 6 * * * cd /path/to/app && npx ts-node scripts/update-listings.ts
   ```

### Ongoing Maintenance

**Daily:** Automatic updates via cron job (or manually)
```bash
npx ts-node scripts/update-listings.ts
```

**Weekly:** Check database stats
```bash
npx ts-node -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.property.count().then(count => {
  console.log(\`Total properties: \${count}\`);
  prisma.\$disconnect();
});
"
```

**Monthly:** Review costs in Bright Data dashboard

---

## 🎯 Cost Calculator

### Scenario 1: One-time Import Only
```
Initial: $250 (100K records)
Monthly: $0 (no updates)
Year 1: $250
```
**Good for:** Static market analysis

### Scenario 2: One-time + Daily Updates
```
Initial: $250 (100K records)
Daily: 500 new listings × $0.75/1K = $0.38/day
Monthly: ~$11/month
Year 1: $250 + $132 = $382
```
**Good for:** Active investors (RECOMMENDED)

### Scenario 3: API Only (No Dataset Purchase)
```
Initial: $0
Daily: 500 listings × $0.75/1K = $0.38/day
Monthly: ~$11/month
Year 1: $132
```
**Good for:** Small-scale testing

---

## 🔧 Customization

### Modify Target Cities

Edit `scripts/update-listings.ts`:

```typescript
const TARGET_CITIES = [
  { city: 'Austin', state: 'TX' },
  { city: 'Houston', state: 'TX' },
  // Add your cities here
  { city: 'Phoenix', state: 'AZ' },
  { city: 'Denver', state: 'CO' },
];
```

### Change Update Frequency

**Twice daily:**
```bash
# 6 AM and 6 PM
0 6,18 * * * cd /path/to/app && npx ts-node scripts/update-listings.ts
```

**Every 6 hours:**
```bash
0 */6 * * * cd /path/to/app && npx ts-node scripts/update-listings.ts
```

**Weekly only (Sundays at 6 AM):**
```bash
0 6 * * 0 cd /path/to/app && npx ts-node scripts/update-listings.ts
```

### Add Email Notifications

Install nodemailer:
```bash
npm install nodemailer @types/nodemailer
```

Add to `update-listings.ts`:
```typescript
import nodemailer from 'nodemailer';

// After update completes
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

await transporter.sendMail({
  from: process.env.SMTP_USER,
  to: 'you@example.com',
  subject: `Property Update: ${totalAdded} new listings`,
  text: `Added ${totalAdded} new properties, updated ${totalUpdated} existing.`,
});
```

---

## 🐛 Troubleshooting

### "API token is invalid"
- Check `.env` file has correct `BRIGHT_DATA_API_TOKEN`
- Verify token in Bright Data dashboard
- Make sure you're signed up and have access

### "Dataset not found"
- Purchase dataset first: https://brightdata.com/products/datasets/real-estate
- Verify `BRIGHT_DATA_DATASET_ID` in `.env`
- Check dataset ID in Bright Data dashboard

### "Database connection failed"
- Make sure PostgreSQL is running
- Verify `DATABASE_URL` in `.env`
- Run: `npx prisma db push`

### "Import taking too long"
- Normal for large datasets (100K+ records)
- Check your internet connection
- Monitor progress in console output

### "Rate limit exceeded"
- Add delays between requests in `update-listings.ts`
- Reduce number of target cities
- Spread updates throughout the day

---

## 📊 Monitoring

### Check Database Size
```bash
psql $DATABASE_URL -c "
SELECT
  COUNT(*) as total_properties,
  COUNT(DISTINCT city) as cities,
  COUNT(DISTINCT state) as states
FROM \"Property\";
"
```

### View Recent Additions
```bash
psql $DATABASE_URL -c "
SELECT city, state, COUNT(*) as count
FROM \"Property\"
WHERE \"createdAt\" > NOW() - INTERVAL '7 days'
GROUP BY city, state
ORDER BY count DESC;
"
```

### Check Update History
```bash
# View cron logs
tail -f /var/log/property-updates.log
```

---

## 💡 Best Practices

1. **Start Small** - Test with one city first
2. **Monitor Costs** - Check Bright Data dashboard weekly
3. **Set Up Alerts** - Email notifications for failed updates
4. **Regular Backups** - Backup PostgreSQL database weekly
5. **Clean Old Data** - Remove stale listings monthly
6. **Index Optimization** - Review and optimize database indexes

---

## 📖 Further Reading

- [BRIGHT_DATA_SETUP.md](../BRIGHT_DATA_SETUP.md) - Complete Bright Data guide
- [FINAL_DATA_STRATEGY.md](../FINAL_DATA_STRATEGY.md) - Full data strategy
- [AWS_DEPLOYMENT_GUIDE.md](../AWS_DEPLOYMENT_GUIDE.md) - Deployment guide

---

**Need help?** Check the main documentation or Bright Data support.
