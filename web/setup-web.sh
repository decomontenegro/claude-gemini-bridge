#!/bin/bash

echo "🌐 Claude-Gemini Bridge Web Setup"
echo "================================="

# Check if we're in the web directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the web directory"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create environment file
if [ ! -f ".env.local" ]; then
    echo "📝 Creating .env.local file..."
    cat > .env.local << EOF
# WebSocket Configuration
NEXT_PUBLIC_WS_URL=http://localhost:3000

# API Configuration  
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Bridge CLI Path (relative to web directory)
BRIDGE_CLI_PATH=../../dist/index.js
EOF
    echo "✅ Created .env.local file"
else
    echo "ℹ️ .env.local already exists"
fi

# Build the project
echo "🏗️ Building the project..."
npm run build

echo ""
echo "✅ Web setup complete!"
echo ""
echo "To start the web interface:"
echo "1. Development mode: npm run dev"
echo "2. Production mode: npm start"
echo ""
echo "The web interface will be available at http://localhost:3000"
echo ""
echo "Features available:"
echo "- 🎯 Visual task executor"
echo "- 📊 Real-time dashboard"
echo "- ⚙️ Configuration panel"
echo "- 🎓 Interactive tutorial"
echo "- 🔌 WebSocket for real-time updates"