#!/bin/bash

# Start script for Claude-Gemini Bridge Server

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Claude-Gemini Bridge Server${NC}"
echo "==============================="

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Dependencies not installed. Running npm install...${NC}"
    npm install
fi

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo -e "${YELLOW}Building TypeScript...${NC}"
    npm run build
fi

# Default to standalone mode
MODE="standalone"
if [ "$1" == "distributed" ]; then
    MODE="distributed"
fi

if [ "$MODE" == "distributed" ]; then
    echo -e "${YELLOW}Starting in DISTRIBUTED mode${NC}"
    
    # Check if Redis is running
    if ! redis-cli ping > /dev/null 2>&1; then
        echo -e "${RED}Error: Redis is not running!${NC}"
        echo "Please start Redis first:"
        echo "  brew services start redis (macOS)"
        echo "  sudo service redis-server start (Linux)"
        echo "  redis-server (direct)"
        exit 1
    fi
    
    echo -e "${GREEN}Redis is running${NC}"
    
    # Start in distributed mode
    DISTRIBUTED_MODE=true NODE_ID="node-$(uuidgen | cut -c1-8)" npm run server
else
    echo -e "${GREEN}Starting in STANDALONE mode${NC}"
    
    # Make sure DISTRIBUTED_MODE is not set
    unset DISTRIBUTED_MODE
    npm run server
fi