#!/bin/bash

echo "🚀 Claude-Gemini Bridge Complete Installation"
echo "============================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check Node.js version
echo -e "${BLUE}Checking prerequisites...${NC}"
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Error: Node.js 18+ is required${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js version OK${NC}"

# Install bridge dependencies
echo -e "\n${BLUE}Installing bridge dependencies...${NC}"
npm install

# Build bridge
echo -e "\n${BLUE}Building bridge...${NC}"
npm run build

# Setup environment
if [ ! -f .env ]; then
    echo -e "\n${YELLOW}Creating .env file...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}Please edit .env and add your API keys${NC}"
fi

# Install web dependencies
echo -e "\n${BLUE}Setting up web interface...${NC}"
cd web
npm install

# Create web environment
if [ ! -f .env.local ]; then
    echo -e "\n${BLUE}Creating web environment...${NC}"
    cat > .env.local << EOF
NEXT_PUBLIC_WS_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000/api
BRIDGE_CLI_PATH=../../dist/index.js
EOF
fi

# Build web
echo -e "\n${BLUE}Building web interface...${NC}"
npm run build

# Create start script
cd ..
echo -e "\n${BLUE}Creating start script...${NC}"
cat > start-all.sh << 'EOF'
#!/bin/bash
echo "Starting Claude-Gemini Bridge with Web Interface..."
echo ""
echo "Web Interface: http://localhost:3000"
echo "Press Ctrl+C to stop"
echo ""

cd web && npm run dev
EOF

chmod +x start-all.sh

# Success message
echo -e "\n${GREEN}================================================================${NC}"
echo -e "${GREEN}✅ Installation Complete!${NC}"
echo -e "${GREEN}================================================================${NC}"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your API keys:"
echo "   - CLAUDE_API_KEY=your_claude_key"
echo "   - GEMINI_API_KEY=your_gemini_key"
echo ""
echo "2. Start the system:"
echo "   ./start-all.sh"
echo ""
echo "3. Open your browser:"
echo "   http://localhost:3000"
echo ""
echo "For CLI usage:"
echo "   ./run.sh --help"
echo ""
echo -e "${BLUE}Happy coding with AI! 🤖✨${NC}"