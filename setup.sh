#!/bin/bash

echo "🔧 Claude-Gemini Bridge Setup"
echo "============================"

# Use local node_modules instead of global
export PATH="./node_modules/.bin:$PATH"

# Clean any previous attempts
echo "🧹 Cleaning previous installations..."
rm -rf node_modules package-lock.json dist

# Install dependencies locally
echo "📦 Installing dependencies..."
npm install --no-save

# Install TypeScript locally if needed
echo "📦 Installing TypeScript locally..."
npm install --save-dev typescript

# Build the project
echo "🏗️ Building project..."
npx tsc

# Create a local executable
echo "🔗 Creating local executable..."
cat > claude-gemini-bridge << 'EOF'
#!/usr/bin/env node
require('./dist/index.js');
EOF

chmod +x claude-gemini-bridge

# Create alias for easier access
echo "📝 Creating alias..."
echo "alias claude-gemini-bridge='$(pwd)/claude-gemini-bridge'" >> ~/.zshrc

echo ""
echo "✅ Setup complete!"
echo ""
echo "To use the bridge, either:"
echo "1. Run: ./claude-gemini-bridge configure"
echo "2. Or restart your terminal and run: claude-gemini-bridge configure"
echo ""
echo "For development mode, run: npm run dev"