#!/bin/bash

echo "🌐 Starting Claude-Gemini Bridge Web Interface"
echo "============================================"
echo ""
echo "Opening in your default browser..."
echo ""

# Try to open browser
if command -v open &> /dev/null; then
    # macOS
    sleep 2 && open http://localhost:3001 &
elif command -v xdg-open &> /dev/null; then
    # Linux
    sleep 2 && xdg-open http://localhost:3001 &
fi

cd web

# Kill any existing process on port 3001
lsof -ti:3001 | xargs kill -9 2>/dev/null

echo "Starting server on http://localhost:3001"
echo "Press Ctrl+C to stop"
echo ""

# Start Next.js directly
npx next dev -p 3001