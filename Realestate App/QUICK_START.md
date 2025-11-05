# Quick Start Guide

Get up and running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- npm installed
- API keys ready (at minimum: OpenAI)

## 1. Install Dependencies

**Note:** You may encounter npm permission errors. If so, run this first:

```bash
sudo chown -R $(whoami) ~/.npm
```

Then install:

```bash
npm install
```

## 2. Set Up Environment

```bash
# Copy environment template
cp .env.example .env
```

**Edit `.env` and add at minimum:**

```env
# Required - Get from https://platform.openai.com
OPENAI_API_KEY="sk-your-key-here"

# Required for database (use this for local testing)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/realestate"

# Required for NextAuth
NEXTAUTH_SECRET="your-secret-key"  # Generate with: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"
```

**Optional APIs** (can add later):
- ZILLOW_API_KEY (from RapidAPI)
- REALTOR_API_KEY (from RapidAPI)
- CRIME_REPORTS_API_KEY (from SpotCrime)

## 3. Set Up Database

### Option A: Use Local PostgreSQL (Recommended)

```bash
# Install PostgreSQL if not installed
# macOS:
brew install postgresql
brew services start postgresql

# Ubuntu:
sudo apt install postgresql
sudo systemctl start postgresql

# Create database
createdb realestate

# Run migrations
npx prisma db push
```

### Option B: Use SQLite (Quick Testing)

Change `.env`:
```env
DATABASE_URL="file:./dev.db"
```

Update `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "sqlite"  // Changed from postgresql
  url      = env("DATABASE_URL")
}
```

Then run:
```bash
npx prisma db push
```

## 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 5. Test the Features

### Test Property Search

1. Go to `/properties/search` (or create the route)
2. Enter:
   - City: "Austin"
   - State: "TX"
   - Max Price: "500000"
3. Click "Search Properties"

**Note:** Without API keys, this will return empty results. The service is ready but needs API credentials.

### Test AI Analysis (Requires OpenAI Key)

```bash
# Test with curl
curl -X POST http://localhost:3000/api/analysis/rental-rate \
  -H "Content-Type: application/json" \
  -d '{
    "property": {
      "address": "123 Main St",
      "city": "Austin",
      "state": "TX",
      "bedrooms": 3,
      "bathrooms": 2,
      "squareFeet": 1800,
      "propertyType": "SINGLE_FAMILY"
    }
  }'
```

### Test Lease Generation (Requires OpenAI Key)

```bash
curl -X POST http://localhost:3000/api/lease/generate \
  -H "Content-Type: application/json" \
  -d '{
    "propertyAddress": "123 Main St",
    "city": "Austin",
    "state": "TX",
    "zipCode": "78701",
    "landlordName": "John Doe",
    "landlordEmail": "john@example.com",
    "landlordPhone": "555-1234",
    "tenantName": "Jane Smith",
    "tenantEmail": "jane@example.com",
    "tenantPhone": "555-5678",
    "startDate": "2024-11-01",
    "endDate": "2025-10-31",
    "monthlyRent": 2400,
    "securityDeposit": 2400
  }'
```

## What Works Without API Keys

✅ **These work immediately:**
- Homepage and UI
- Dashboard layout
- Tenant portal UI
- Database models
- Form validation
- File structure

❌ **These need API keys:**
- Property search (needs Zillow/Realtor APIs)
- AI analysis (needs OpenAI)
- Crime data (needs crime APIs)
- Lease generation (needs OpenAI)

## Next Steps

### 1. Get API Keys

**Priority 1: OpenAI (Required for AI features)**
- Visit: https://platform.openai.com
- Cost: ~$5-10/month for testing
- Enables: CMA, rental analysis, lease generation

**Priority 2: Property Data (For search)**
- Sign up: https://rapidapi.com
- Subscribe to: Zillow API + Realtor API
- Free tier: 500 requests/month each

**Priority 3: Crime Data (For safety analysis)**
- SpotCrime: https://spotcrime.com/api
- FBI API: https://api.data.gov/signup/

### 2. Customize

**Update branding:**
```typescript
// src/app/layout.tsx
export const metadata = {
  title: 'Your Company Name',
  description: 'Your custom description',
};
```

**Change colors:**
```typescript
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      primary: '#your-color',
    },
  },
},
```

### 3. Add Authentication

```bash
# Install dependencies
npm install next-auth @next-auth/prisma-adapter bcryptjs

# Set up auth routes (example files available in docs)
```

## Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
npm run dev -- -p 3001
```

### Database Errors

```bash
# Reset database
npx prisma db push --force-reset

# View in Prisma Studio
npx prisma studio
```

### Module Not Found

```bash
# Clear and reinstall
rm -rf .next node_modules
npm install
```

### API Errors

Check `.env` file:
- All keys have values (no empty strings)
- No extra quotes or spaces
- OPENAI_API_KEY starts with `sk-`

## Development Tips

### View Database

```bash
npx prisma studio
```
Opens at http://localhost:5555

### Check Logs

```bash
# In dev mode, logs appear in terminal
npm run dev

# Check browser console for client-side errors
```

### Test API Routes

Use Bruno, Postman, or curl:

```bash
# Test endpoint
curl http://localhost:3000/api/properties/search
```

## Production Checklist

Before deploying:

- [ ] All API keys in production environment
- [ ] Database backed up
- [ ] Environment variables set on hosting platform
- [ ] HTTPS enabled
- [ ] Error monitoring configured (Sentry)
- [ ] Rate limiting enabled
- [ ] CORS configured
- [ ] Security headers set

## Support

**Common Issues:**
1. **"Module not found"** → Run `npm install`
2. **Database errors** → Check PostgreSQL is running
3. **API errors** → Verify API keys in `.env`
4. **Port in use** → Use different port or kill process

**Get Help:**
- Check README.md for detailed docs
- Check SETUP_GUIDE.md for complete setup
- Review error messages in terminal

## Cost Estimate

**Minimal Setup (Testing):**
- OpenAI: $5-10/month
- Total: $5-10/month

**Full Setup (Production):**
- OpenAI: $20-50/month
- RapidAPI: $0-30/month (free tier usually enough)
- Database: $0-15/month (free tier on Vercel/Railway)
- Hosting: $0-20/month (Vercel free tier)
- **Total: $20-115/month**

Start with minimal setup, add services as needed!
