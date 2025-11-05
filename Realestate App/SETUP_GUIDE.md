# Complete Setup Guide

## Step-by-Step Installation

### 1. System Requirements

- **Node.js**: 18.x or higher
- **npm**: 9.x or higher
- **PostgreSQL**: 14.x or higher
- **Git**: Latest version

### 2. Database Setup

#### Install PostgreSQL

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

#### Create Database

```bash
# Access PostgreSQL
psql postgres

# Create database and user
CREATE DATABASE realestate_investor;
CREATE USER realestate_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE realestate_investor TO realestate_user;
\q
```

### 3. API Keys Setup

#### OpenAI API Key (Required)

1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up or log in
3. Navigate to API Keys section
4. Click "Create new secret key"
5. Copy the key (starts with `sk-`)
6. **Important**: Add billing method to your OpenAI account

**Pricing Estimate:**
- CMA Analysis: ~$0.02-0.05 per property
- Lease Generation: ~$0.03-0.07 per document
- Rental Estimation: ~$0.01-0.03 per property

#### Property APIs (Via RapidAPI)

1. **Sign up at RapidAPI**
   - Go to [rapidapi.com](https://rapidapi.com)
   - Create free account

2. **Subscribe to Zillow API**
   - Search for "Zillow" on RapidAPI
   - Choose "Zillow API" by apimaker
   - Subscribe to free tier (500 requests/month)
   - Copy your API key from the dashboard

3. **Subscribe to Realtor.com API**
   - Search for "Realtor" on RapidAPI
   - Choose "Realtor API" by apimaker
   - Subscribe to free tier
   - Copy your API key

#### Crime Data APIs

**Option 1: SpotCrime (Recommended)**
```
Website: https://spotcrime.com/api
Process:
1. Request API access via contact form
2. Receive API key via email
3. Free tier: 1000 requests/month
```

**Option 2: FBI Crime Data Explorer**
```
Website: https://crime-data-explorer.fr.cloud.gov/api
Process:
1. Go to https://api.data.gov/signup/
2. Register for free API key
3. Use for FBI Crime Data API
4. Free tier: 1000 requests/hour
```

**Option 3: CrimeReports.com**
```
Contact: api@crimereports.com
Note: Requires business verification
```

#### Facebook Marketplace (Optional)

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Create new app
3. Add "Marketplace API" product
4. Get User Access Token
5. Note: Limited access, approval required

### 4. Environment Configuration

Create `.env` file:

```bash
# Copy example
cp .env.example .env

# Edit with your values
nano .env  # or use any text editor
```

**.env file contents:**

```env
# Database
DATABASE_URL="postgresql://realestate_user:your_secure_password@localhost:5432/realestate_investor"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-a-random-secret-here"  # Generate: openssl rand -base64 32

# OpenAI
OPENAI_API_KEY="sk-your-openai-key-here"

# Property APIs (RapidAPI)
ZILLOW_API_KEY="your-rapidapi-key-here"
REALTOR_API_KEY="your-rapidapi-key-here"

# Facebook (Optional)
FACEBOOK_GRAPH_API_KEY="your-facebook-token-here"

# Crime Data
SPOTCRIME_API_KEY="your-spotcrime-key-here"
FBI_CRIME_DATA_API_KEY="your-fbi-api-key-here"
CRIME_REPORTS_API_KEY="your-crimereports-key-here"

# File Upload (Choose one)
# Option 1: Cloudinary
CLOUDINARY_URL="cloudinary://api_key:api_secret@cloud_name"
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your-cloud-name"

# Option 2: AWS S3
AWS_ACCESS_KEY_ID="your-aws-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="realestate-uploads"

# Email (Optional - for notifications)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
```

### 5. Install Dependencies

```bash
npm install
```

If you encounter npm permission errors:
```bash
# Fix npm permissions
sudo chown -R $USER:$GROUP ~/.npm
sudo chown -R $USER:$GROUP ~/.config

# Try again
npm install
```

### 6. Database Migration

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# (Optional) Seed with sample data
npx prisma db seed
```

### 7. Run Development Server

```bash
npm run dev
```

Visit: [http://localhost:3000](http://localhost:3000)

## Troubleshooting

### Database Connection Issues

**Error: `ECONNREFUSED`**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql  # Linux
brew services list  # macOS

# Check connection
psql -h localhost -U realestate_user -d realestate_investor
```

**Error: `password authentication failed`**
- Verify password in `.env` matches database user password
- Check PostgreSQL `pg_hba.conf` allows local connections

### API Issues

**OpenAI Errors**
- Verify API key is correct
- Check billing is enabled on OpenAI account
- Ensure sufficient credits

**RapidAPI Rate Limits**
- Free tier: 500 requests/month
- Upgrade plan if needed
- Implement caching to reduce requests

### Build Errors

**TypeScript Errors**
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run dev
```

**Module Not Found**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## Production Deployment

### Option 1: Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add OPENAI_API_KEY
vercel env add DATABASE_URL
# ... add all other env vars
```

### Option 2: Docker

```dockerfile
# Create Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

```bash
# Build and run
docker build -t realestate-app .
docker run -p 3000:3000 --env-file .env realestate-app
```

### Option 3: VPS (Ubuntu)

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Clone and setup
git clone <your-repo>
cd realestate-app
npm install
npx prisma generate
npm run build

# Start with PM2
pm2 start npm --name "realestate-app" -- start
pm2 save
pm2 startup
```

## Security Checklist

- [ ] Change all default passwords
- [ ] Use strong `NEXTAUTH_SECRET`
- [ ] Enable HTTPS in production
- [ ] Set up CORS properly
- [ ] Implement rate limiting
- [ ] Use environment variables for all secrets
- [ ] Enable database backups
- [ ] Set up error monitoring (Sentry)
- [ ] Configure CSP headers
- [ ] Regular security updates

## Performance Optimization

### Enable Caching

```typescript
// Add to next.config.ts
const nextConfig = {
  // ... existing config
  headers: async () => [
    {
      source: '/api/properties/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      ],
    },
  ],
};
```

### Database Indexing

Prisma schema already includes indexes for:
- Property searches (city, state, status)
- Lease queries
- Maintenance requests

### Image Optimization

Configure image CDN (Cloudinary recommended):
```bash
npm install cloudinary next-cloudinary
```

## Next Steps

1. **Test Core Features**
   - Search properties
   - Generate CMA
   - Create lease
   - Submit maintenance request

2. **Customize Branding**
   - Update colors in `tailwind.config.ts`
   - Replace logo in `public/`
   - Modify metadata in `layout.tsx`

3. **Add Authentication**
   - Implement NextAuth.js
   - Add user registration
   - Set up role-based access

4. **Configure Notifications**
   - Email alerts for maintenance
   - SMS notifications (Twilio)
   - Push notifications

5. **Set Up Analytics**
   - Google Analytics
   - Mixpanel for user tracking
   - Error monitoring (Sentry)

## Support

Need help? Check:
- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [OpenAI API Docs](https://platform.openai.com/docs)

## API Testing

Use the included test scripts:

```bash
# Test property search
curl -X POST http://localhost:3000/api/properties/search \
  -H "Content-Type: application/json" \
  -d '{"city":"Austin","state":"TX","maxPrice":500000}'

# Test CMA generation
curl -X POST http://localhost:3000/api/analysis/cma \
  -H "Content-Type: application/json" \
  -d @test-property.json

# Test crime data
curl -X POST http://localhost:3000/api/crime \
  -H "Content-Type: application/json" \
  -d '{"latitude":30.2672,"longitude":-97.7431,"address":"Austin, TX"}'
```
