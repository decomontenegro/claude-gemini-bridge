# API Integration Guide

## Overview
The Claude-Gemini Bridge has been updated to use the official APIs instead of CLI commands.

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure API Keys
Copy `.env.example` to `.env` and add your API keys:

```bash
cp .env.example .env
```

Edit `.env` and add:
```
CLAUDE_API_KEY=your_claude_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

### Getting API Keys
- **Claude API Key**: Get from https://console.anthropic.com/
- **Gemini API Key**: Get from https://makersuite.google.com/app/apikey

## Architecture Changes

### Before (CLI-based)
- Used `spawn()` to execute CLI commands
- Required local CLI installations
- Limited to CLI capabilities

### After (API-based)
- Direct API integration using official SDKs
- No local CLI dependencies
- Full access to API features

## Updated Adapters

### ClaudeAdapter
- Uses `@anthropic-ai/sdk`
- Model: `claude-3-5-sonnet-20241022`
- Capabilities: Code generation, analysis, validation, complex reasoning

### GeminiAdapter
- Uses `@google/generative-ai`
- Model: `gemini-1.5-pro`
- Capabilities: Multimodal processing, large context, web search

## Running the Demo

```bash
# Build the project
npm run build

# Run the demo
node dist/demo.js
```

The demo demonstrates:
1. Code generation with Claude
2. Multimodal analysis with Gemini
3. Hybrid execution with both AIs

## Key Improvements

1. **Real API Integration**: No more CLI simulation
2. **Better Error Handling**: Proper API error messages
3. **Enhanced Capabilities**: Access to latest models
4. **Improved Performance**: Direct API calls are faster
5. **Better Logging**: Detailed execution logs

## Usage Example

```typescript
import { Orchestrator } from './orchestration/orchestrator.js';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  transports: [new winston.transports.Console()]
});

const orchestrator = new Orchestrator(logger);

// Create a task
const task = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  type: 'code',
  payload: { 
    description: 'Create a TypeScript function' 
  },
  createdAt: new Date().toISOString()
};

// Process with orchestration
const message = {
  source: 'claude',
  task,
  orchestrator: true,
  metadata: {
    timestamp: new Date().toISOString(),
    priority: 'high'
  }
};

const result = await orchestrator.processMessage(message);
console.log(result);
```

## Next Steps

1. Add retry logic for API failures
2. Implement caching for repeated requests
3. Add rate limiting to respect API quotas
4. Enhance cross-validation between AIs
5. Add support for streaming responses