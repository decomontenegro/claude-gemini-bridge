#!/bin/bash

# Start script for Claude-Gemini Bridge in Distributed Mode

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}Claude-Gemini Bridge - Distributed Mode${NC}"
echo "========================================="

# Get script directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check if Redis is installed
REDIS_DIR="$DIR/redis-bin"
if [ -f "$REDIS_DIR/redis-server" ]; then
    REDIS_SERVER="$REDIS_DIR/redis-server"
    REDIS_CLI="$REDIS_DIR/redis-cli"
else
    echo -e "${RED}Redis is not installed!${NC}"
    echo "Please install Redis first:"
    echo "  macOS: brew install redis"
    echo "  Ubuntu: sudo apt-get install redis-server"
    echo "  Other: https://redis.io/download"
    exit 1
fi

# Check if Redis is running
if ! $REDIS_CLI ping > /dev/null 2>&1; then
    echo -e "${YELLOW}Redis is not running. Starting Redis...${NC}"
    
    # Start Redis in background
    echo -e "${BLUE}Starting Redis server...${NC}"
    $REDIS_SERVER --daemonize yes
    
    # Wait for Redis to start
    sleep 2
    
    # Check again
    if ! $REDIS_CLI ping > /dev/null 2>&1; then
        echo -e "${RED}Failed to start Redis${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓ Redis is running${NC}"

# Build if needed
if [ ! -d "dist" ]; then
    echo -e "${YELLOW}Building TypeScript...${NC}"
    npm run build
fi

# Function to start a node
start_node() {
    local NODE_NUM=$1
    local NODE_ID="node-$NODE_NUM"
    local PORT=$((3001 + NODE_NUM - 1))
    
    echo -e "${BLUE}Starting $NODE_ID on port $PORT...${NC}"
    
    DISTRIBUTED_MODE=true \
    NODE_ID=$NODE_ID \
    PORT=$PORT \
    LOG_LEVEL=info \
    node dist/server/bridge-server.js &
    
    echo $! > ".pid-$NODE_ID"
    echo -e "${GREEN}✓ $NODE_ID started (PID: $!)${NC}"
}

# Function to stop all nodes
stop_nodes() {
    echo -e "${YELLOW}Stopping all nodes...${NC}"
    
    for pid_file in .pid-node-*; do
        if [ -f "$pid_file" ]; then
            PID=$(cat "$pid_file")
            if ps -p $PID > /dev/null; then
                kill $PID
                echo -e "${GREEN}✓ Stopped PID $PID${NC}"
            fi
            rm "$pid_file"
        fi
    done
}

# Trap to clean up on exit
trap stop_nodes EXIT

# Parse arguments
NODES=2
if [ "$1" == "stop" ]; then
    stop_nodes
    exit 0
elif [ -n "$1" ] && [ "$1" -eq "$1" ] 2>/dev/null; then
    NODES=$1
fi

echo -e "${BLUE}Starting $NODES nodes...${NC}"
echo

# Start nodes
for i in $(seq 1 $NODES); do
    start_node $i
    sleep 1
done

echo
echo -e "${GREEN}All nodes started!${NC}"
echo
echo "Dashboard Web Interface:"
echo "  - URL: http://localhost:3000"
echo "  - Run 'cd web && npm run dev' to start the dashboard"
echo
echo "API Server URLs:"
for i in $(seq 1 $NODES); do
    PORT=$((3001 + i - 1))
    echo "  - Node $i API: http://localhost:$PORT"
done
echo
echo "API endpoints:"
echo "  - Health: http://localhost:3001/api/v1/health"
echo "  - Metrics: http://localhost:3001/api/v1/metrics"
echo "  - Cluster Stats: http://localhost:3001/api/v1/cluster/stats"
echo
echo -e "${YELLOW}Press Ctrl+C to stop all nodes${NC}"

# Wait for interrupt
wait