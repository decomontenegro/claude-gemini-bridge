# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Bridge
```bash
# Install dependencies and build
./setup.sh

# Development with hot reload
npm run dev

# Build TypeScript
npm run build

# Run production build
npm start
# or
./run.sh

# Code quality
npm run lint
npm run typecheck
```

### Web Interface
```bash
cd web

# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Run production server
npm start
```

## Architecture Overview

This is a Claude-Gemini Bridge system that orchestrates AI assistants:

### Core Components

1. **Adapters** (`src/adapters/`): API interfaces for Claude and Gemini
   - `ClaudeAdapter.ts`: Integrates with Anthropic API (@anthropic-ai/sdk)
   - `GeminiAdapter.ts`: Integrates with Google Generative AI (@google/generative-ai)
   - Each adapter handles API communication, error handling, and response formatting

2. **Orchestration** (`src/orchestration/`): 
   - `TaskRouter.ts`: Routes tasks to appropriate AI based on capabilities
   - `OrchestratorCore.ts`: Main orchestration logic with three execution modes:
     - Single CLI execution
     - Hybrid execution (parallel processing)
     - Orchestrated execution (one AI manages the other)

3. **Learning Module** (`src/learning/`):
   - `LearningModule.ts`: Tracks usage patterns and optimizes routing
   - Stores performance metrics to improve task assignment over time

4. **CLI Interface** (`src/cli/`):
   - `index.ts`: Main entry point using Commander.js
   - Supports multiple user personas (newbie, individual, team, enterprise, researcher)

### Web Interface (`web/`)

Next.js 14 app with:
- **API Routes** (`web/src/app/api/`): RESTful endpoints for bridge control
- **WebSocket Server** (`web/server-socket.ts`): Real-time communication
- **State Management**: Zustand stores in `web/src/store/`
- **UI Components**: Radix UI + Tailwind CSS

### Key Design Patterns

1. **Adapter Pattern**: Uniform interface for different AI CLIs
2. **Strategy Pattern**: Different execution modes based on task type
3. **Observer Pattern**: Event-driven communication between components
4. **Factory Pattern**: Dynamic adapter creation based on configuration

## Important Implementation Details

### Type Safety
- Strict TypeScript configuration
- Zod schemas for runtime validation (see `src/types/`)
- All async operations properly typed with error handling

### Process Management
- Child processes for CLI adapters with proper cleanup
- Stream-based communication for real-time output
- Graceful shutdown handling

### Configuration
- Environment variables in `.env` for API keys (CLAUDE_API_KEY, GEMINI_API_KEY)
- API integration using official SDKs
- JSON-based configuration in `config/` directory
- User preferences stored locally

### Security Considerations
- API keys never logged or exposed
- Local-only communication between CLIs
- Process isolation between adapters
- Input sanitization for all user commands

## Common Development Tasks

### Adding New AI Adapter
1. Create new adapter in `src/adapters/` implementing `BaseAdapter`
2. Register in `src/orchestration/OrchestratorCore.ts`
3. Add routing logic in `src/orchestration/TaskRouter.ts`
4. Update type definitions in `src/types/`

### Modifying Task Routing
- Edit `src/orchestration/TaskRouter.ts` for routing logic
- Update capability mappings in adapter classes
- Test with different task types

### Extending Web Interface
- Add new pages in `web/src/app/`
- Create API routes in `web/src/app/api/`
- Update stores in `web/src/store/` for state management
- Follow Next.js 14 App Router conventions