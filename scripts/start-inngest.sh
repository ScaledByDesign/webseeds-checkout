#!/bin/bash

# Start Inngest Dev Server for WebSeeds
# This script starts Inngest with the correct configuration for local development

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Inngest Dev Server for WebSeeds...${NC}"

# Set environment variables
export INNGEST_DEV=1
export INNGEST_LOG_LEVEL=info

# Start Inngest dev server
npx inngest-cli@latest dev \
  --no-discovery \
  -u http://localhost:3255/api/inngest \
  --port 8288

echo -e "${GREEN}✅ Inngest Dev Server started successfully!${NC}"
echo -e "${BLUE}📊 Inngest UI available at: http://localhost:8288${NC}"
