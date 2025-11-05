#!/bin/bash

# Real Estate Investor Platform - Vercel Deployment Script
# This script automates the Vercel deployment process

echo "🚀 Real Estate Investor Platform - Deployment to Vercel"
echo "======================================================"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

echo "✅ Vercel CLI is ready"
echo ""

# Deploy to Vercel
echo "🌐 Deploying to Vercel..."
echo ""
echo "IMPORTANT: When prompted, configure these settings:"
echo "  - Set up and deploy: Yes"
echo "  - Which scope: Your personal account"
echo "  - Link to existing project: No"
echo "  - Project name: realestate-investor-app"
echo "  - Directory: ./"
echo "  - Override settings: No"
echo ""
read -p "Press Enter to continue with deployment..."

vercel --prod

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Go to https://vercel.com/dashboard"
echo "2. Click on your project: realestate-investor-app"
echo "3. Go to Settings → Environment Variables"
echo "4. Add these required variables:"
echo ""
echo "   Required for basic functionality:"
echo "   - DATABASE_URL (PostgreSQL connection string - see below)"
echo "   - NEXTAUTH_URL (your Vercel deployment URL)"
echo "   - NEXTAUTH_SECRET (generate with: openssl rand -base64 32)"
echo ""
echo "   Required for AI features:"
echo "   - OPENAI_API_KEY (your OpenAI API key)"
echo ""
echo "   Optional - Property Data:"
echo "   - BRIGHT_DATA_API_TOKEN (already have: b773aaf2-a632-459f-b217-5d38368db5f6)"
echo "   - BRIGHT_DATA_DATASET_ID (already have: gd_lwh4f6i08oqu8aw1q5)"
echo ""
echo "5. Redeploy after adding environment variables"
echo ""
echo "🗄️  Database Setup (AWS RDS PostgreSQL):"
echo "   Run: ./setup-aws-rds.sh"
echo ""
