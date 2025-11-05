# Real Estate Investor Platform

A comprehensive platform for real estate investors to find properties, analyze deals, manage tenants, and streamline operations.

## 🚀 Features

### Property Discovery
- **Multi-Source Aggregation**: Search properties from Zillow, Realtor.com, and Facebook Marketplace
- **Advanced Filtering**: Filter by location, price, bedrooms, property type, and more
- **Duplicate Detection**: Automatically removes duplicate listings from different sources

### AI-Powered Analysis
- **Comparative Market Analysis (CMA)**: AI-generated property valuations using GPT-4
- **Rental Rate Estimation**: Smart rental price predictions based on market data
- **Investment Projections**: ROI calculations and cash flow analysis
- **Market Trends**: Historical price trends and appreciation forecasts

### Safety & Demographics
- **Crime Data Integration**: Access police reports and crime statistics for any location
- **Safety Grades**: A-F safety ratings for neighborhoods
- **Tenant Demographics**: AI analysis of rental demand and tenant profiles

### Lease Management
- **Automated Lease Generation**: AI-powered lease agreements with legal compliance
- **State-Specific Compliance**: Lease terms tailored to state laws
- **Move-In Checklists**: Comprehensive property inspection documents
- **Lease Amendments**: Easy modifications to existing leases

### Tenant Portal
- **Maintenance Requests**: Tenants can report issues with photos
- **Request Tracking**: Real-time status updates on maintenance tickets
- **Photo Uploads**: Attach multiple images to maintenance requests
- **Communication**: Direct messaging with property managers

## 🛠 Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **AI**: OpenAI GPT-4 for analysis and document generation
- **APIs**:
  - Zillow (via RapidAPI)
  - Realtor.com (via RapidAPI)
  - Facebook Graph API
  - Crime Data APIs (SpotCrime, FBI Crime Data)

## 📦 Installation

### Prerequisites
- Node.js 18+
- PostgreSQL database
- API Keys (see below)

### Setup Steps

1. **Clone and Install**
```bash
cd "Realestate App"
npm install
```

2. **Environment Variables**
```bash
cp .env.example .env
```

Edit `.env` and add your API keys:
- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: OpenAI API key for AI analysis
- `ZILLOW_API_KEY`: Zillow/RapidAPI key
- `REALTOR_API_KEY`: Realtor.com/RapidAPI key
- `FACEBOOK_GRAPH_API_KEY`: Facebook Graph API token
- `CRIME_REPORTS_API_KEY`: Crime data API key

3. **Database Setup**
```bash
npx prisma generate
npx prisma db push
```

4. **Run Development Server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🔑 API Keys Required

### OpenAI (Required for AI features)
- Sign up at [platform.openai.com](https://platform.openai.com)
- Create API key
- Pricing: ~$0.01-0.03 per analysis

### Property Data APIs

**Option 1: RapidAPI (Recommended)**
- Sign up at [rapidapi.com](https://rapidapi.com)
- Subscribe to:
  - Zillow API
  - Realtor.com API

**Option 2: Direct APIs**
- Zillow Bridge API (partners only)
- Realtor.com Data API

### Crime Data APIs
- **SpotCrime**: [spotcrime.com/api](https://spotcrime.com/api)
- **FBI Crime Data**: [crime-data-explorer.fr.cloud.gov/api](https://crime-data-explorer.fr.cloud.gov/api)
- **CrimeReports.com**: Contact for API access

### Facebook Marketplace (Optional)
- Create Facebook App at [developers.facebook.com](https://developers.facebook.com)
- Get Graph API token

## 🗂 Project Structure

```
src/
├── app/
│   ├── api/              # API routes
│   │   ├── properties/   # Property search
│   │   ├── analysis/     # CMA & rental analysis
│   │   ├── crime/        # Crime data
│   │   ├── lease/        # Lease generation
│   │   └── maintenance/  # Maintenance requests
│   ├── dashboard/        # Investor dashboard
│   ├── tenant-portal/    # Tenant portal
│   └── page.tsx          # Landing page
├── components/           # React components
├── services/             # Business logic
│   ├── propertyAggregator.ts  # Multi-source property search
│   ├── aiAnalysis.ts          # AI-powered CMA & analysis
│   ├── crimeData.ts           # Crime data integration
│   └── leaseGenerator.ts      # Lease document generation
├── types/                # TypeScript types
└── lib/                  # Utilities
prisma/
└── schema.prisma         # Database schema
```

## 🎯 Usage

### Search Properties
```typescript
// POST /api/properties/search
{
  "city": "Austin",
  "state": "TX",
  "minPrice": 200000,
  "maxPrice": 500000,
  "minBedrooms": 3,
  "sources": ["zillow", "realtor", "facebook"]
}
```

### Generate CMA Report
```typescript
// POST /api/analysis/cma
{
  "property": { /* property object */ },
  "comparables": [ /* array of comparable properties */ ]
}
```

### Get Crime Data
```typescript
// POST /api/crime
{
  "latitude": 30.2672,
  "longitude": -97.7431,
  "address": "123 Main St, Austin, TX"
}
```

### Generate Lease
```typescript
// POST /api/lease/generate
{
  "propertyAddress": "123 Main St",
  "landlordName": "John Doe",
  "tenantName": "Jane Smith",
  "monthlyRent": 2400,
  "securityDeposit": 2400,
  "startDate": "2024-11-01",
  "endDate": "2025-10-31"
}
```

## 🔐 Authentication

The app uses NextAuth.js for authentication. To set up:

1. Add `NEXTAUTH_SECRET` to `.env`
2. Configure providers in `src/app/api/auth/[...nextauth]/route.ts`
3. Implement user registration and login

## 🚀 Deployment

### Vercel (Recommended)
```bash
vercel deploy
```

### Docker
```bash
docker build -t realestate-app .
docker run -p 3000:3000 realestate-app
```

### Environment Variables
Make sure to set all environment variables in your deployment platform.

## 📊 Database Schema

Key models:
- **User**: Investors and tenants
- **Property**: Property listings and owned properties
- **Lease**: Lease agreements
- **Tenant**: Tenant information and screening
- **MaintenanceRequest**: Tenant maintenance requests
- **CMAReport**: AI-generated market analysis
- **CrimeReport**: Crime data cache

## 🧪 Testing

```bash
# Run tests
npm test

# Run E2E tests
npm run test:e2e
```

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Contributing

Contributions welcome! Please read CONTRIBUTING.md first.

## 📞 Support

- Documentation: [docs link]
- Issues: [GitHub Issues]
- Email: support@example.com

## ⚠️ Legal Notice

This platform is for informational purposes. Always:
- Verify property data from official sources
- Consult with real estate attorneys for legal documents
- Comply with Fair Housing laws
- Follow state and local regulations

## 🔄 Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Property portfolio optimization
- [ ] Automated rent collection
- [ ] Contractor management
- [ ] Financial reporting
- [ ] Tax document generation
- [ ] Multi-language support
