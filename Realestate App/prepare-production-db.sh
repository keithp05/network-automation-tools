#!/bin/bash

# Prepare Database for Production
# Switches from SQLite to PostgreSQL and runs migrations

echo "🗄️  Preparing Database for Production"
echo "====================================="
echo ""

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "❌ .env.production not found"
    echo "Run ./setup-aws-rds.sh first to create your database"
    exit 1
fi

echo "✅ Found production database configuration"
echo ""

# Update Prisma schema for PostgreSQL
echo "📝 Updating Prisma schema for PostgreSQL..."

# Backup current schema
cp prisma/schema.prisma prisma/schema.prisma.backup

# Update provider from sqlite to postgresql
sed -i '' 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma

# Update fields that need PostgreSQL-specific changes
# Arrays are supported in PostgreSQL
sed -i '' 's/images String?/images String[]/' prisma/schema.prisma

echo "✅ Schema updated for PostgreSQL"
echo ""

# Generate Prisma Client for PostgreSQL
echo "🔧 Generating Prisma Client..."
npx prisma generate

echo "✅ Prisma Client generated"
echo ""

# Load production DATABASE_URL
export $(cat .env.production | grep DATABASE_URL | xargs)

# Run migrations
echo "🚀 Running database migrations..."
echo "   This will create all tables in your production database"
echo ""

npx prisma migrate deploy

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database migrations complete!"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Add DATABASE_URL to Vercel environment variables"
    echo "2. Redeploy your app in Vercel dashboard"
    echo "3. Your app will now use production PostgreSQL database"
    echo ""
    echo "🔗 DATABASE_URL (copy this to Vercel):"
    echo "$DATABASE_URL"
    echo ""
else
    echo ""
    echo "❌ Migration failed"
    echo "Check the error message above"
    echo ""
    echo "To restore SQLite schema:"
    echo "  mv prisma/schema.prisma.backup prisma/schema.prisma"
fi
