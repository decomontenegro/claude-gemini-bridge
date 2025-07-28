#!/bin/bash

# Simple server startup script
echo "Starting Claude-Gemini Bridge Server..."
echo "Mode: Standalone (no Redis required)"
echo ""

# Ensure we're in the right directory
cd "$(dirname "$0")"

# Run the server
npm run server