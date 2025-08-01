#!/bin/bash

# Greenhouse Management System Startup Script
# This script starts the complete greenhouse application

echo "🏡 Starting Greenhouse Management System..."
echo "=========================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+ and try again.${NC}"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version 18+ is required. Current version: $(node -v)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node -v) detected${NC}"

# Change to backend directory
cd backend

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json not found in backend directory${NC}"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from .env.example...${NC}"
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${YELLOW}📝 Please edit .env file with your configuration before running again${NC}"
        echo -e "${YELLOW}   Important: Set your OPENAI_API_KEY and database configuration${NC}"
        exit 1
    else
        echo -e "${RED}❌ .env.example not found. Cannot create .env file.${NC}"
        exit 1
    fi
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to install dependencies${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Dependencies already installed${NC}"
fi

# Create necessary directories
echo -e "${YELLOW}📁 Creating necessary directories...${NC}"
mkdir -p uploads/images
mkdir -p uploads/videos  
mkdir -p logs

# Check TypeScript compilation
echo -e "${YELLOW}🔧 Checking TypeScript compilation...${NC}"
npm run typecheck
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ TypeScript compilation failed${NC}"
    exit 1
fi

# Start the application
echo -e "${GREEN}🚀 Starting Greenhouse Management System...${NC}"
echo ""
echo "Dashboard will be available at:"
echo -e "${GREEN}  📱 Login/Register: http://localhost:3000${NC}"
echo -e "${GREEN}  🏡 Dashboard: http://localhost:3000/dashboard${NC}"
echo -e "${GREEN}  🌱 Planner: http://localhost:3000/planner${NC}"
echo -e "${GREEN}  📅 Calendar: http://localhost:3000/calendar${NC}"
echo -e "${GREEN}  🔋 Climate Battery: http://localhost:3000/climate-battery${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
echo ""

# Start the development server
npm run dev