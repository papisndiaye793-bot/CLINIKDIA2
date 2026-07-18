#!/bin/bash
# ClinikDia - Render Deployment Script
# Usage: bash deploy-render.sh

set -e

echo "╔═══════════════════════════════════════════╗"
echo "║  ClinikDia - Render Deployment Script    ║"
echo "╚═══════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
RENDER_API_TOKEN=${RENDER_API_TOKEN:-""}
GITHUB_REPO="papisndiaye793-bot/CLINIKDIA2"
JWT_SECRET="d5c15007d6bcbb990341ebc08cc3cac2923293002df9f4b85f561693981d9f75d576d4b04b1ca57b2cbc4378626e6830"
REGION="frankfurt"

echo -e "${YELLOW}Prerequisites:${NC}"
echo "1. Render account created"
echo "2. GitHub connected to Render"
echo "3. RENDER_API_TOKEN exported (optional for automation)"
echo ""

# Check if running locally or in CI
if [ -z "$RENDER_API_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  No RENDER_API_TOKEN found${NC}"
    echo ""
    echo "To automate deployment, get your API token from:"
    echo "  https://dashboard.render.com/api-tokens"
    echo ""
    echo "Then export it:"
    echo "  export RENDER_API_TOKEN='your-token-here'"
    echo ""
    echo "For now, follow manual steps below..."
    echo ""
fi

echo -e "${GREEN}✅ Manual Deployment Steps:${NC}"
echo ""
echo "Step 1: Create PostgreSQL Database"
echo "  URL: https://dashboard.render.com/new/postgres"
echo "  Settings:"
echo "    • Name: clinikdia-db"
echo "    • Database: clinikdia"
echo "    • User: clinikdia"
echo "    • Region: $REGION"
echo "    • Plan: Free"
echo ""
echo "  ⏳ After creation, COPY the 'Internal Connection String'"
echo ""

echo "Step 2: Create Web Service (Backend)"
echo "  URL: https://dashboard.render.com/new/webservice"
echo "  Settings:"
echo "    • Repository: $GITHUB_REPO"
echo "    • Branch: main"
echo "    • Name: clinikdia-api"
echo "    • Environment: Node"
echo "    • Region: $REGION"
echo "    • Plan: Free"
echo ""
echo "  Build Command:"
echo "    npm --prefix server install && npm --prefix server run build"
echo ""
echo "  Start Command:"
echo "    npm --prefix server run start:prod"
echo ""
echo "  Environment Variables:"
echo "    • DATABASE_URL: [from Step 1]"
echo "    • JWT_SECRET: $JWT_SECRET"
echo "    • NODE_ENV: production"
echo ""

echo "Step 3: Copy Backend URL"
echo "  After deployment (2-3 min), copy the service URL"
echo "  Format: https://clinikdia-api.onrender.com"
echo ""

echo "Step 4: Update Netlify"
echo "  URL: https://app.netlify.com/projects/legendary-gecko-65ebab/settings/builds"
echo "  • Go to Environment variables"
echo "  • Add/Update: VITE_API_BASE = https://clinikdia-api.onrender.com"
echo "  • Trigger deploy"
echo ""

echo -e "${GREEN}✅ Done!${NC}"
echo ""
echo "Your app will be live at:"
echo "  Frontend: https://legendary-gecko-65ebab.netlify.app"
echo "  Backend: https://clinikdia-api.onrender.com"
echo ""

# Render API Deployment (if token available)
if [ ! -z "$RENDER_API_TOKEN" ]; then
    echo -e "${GREEN}🚀 Attempting API Deployment...${NC}"
    echo ""
    
    # This would require more complex API calls
    # For now, just show the API endpoint
    echo "Render API Endpoint: https://api.render.com/v1"
    echo "Documentation: https://render.com/docs/api-reference"
fi

echo ""
echo -e "${YELLOW}💡 Need Help?${NC}"
echo "  • Render Docs: https://render.com/docs"
echo "  • GitHub Repo: https://github.com/papisndiaye793-bot/CLINIKDIA2"
echo ""
