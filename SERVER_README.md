# Claude-Gemini Bridge Server

## Quick Start

### Standalone Mode (Default)
The simplest way to run the server - no Redis required:

```bash
./start-server.sh
```

Or manually:
```bash
npm run build
npm run server
```

The server will start on http://localhost:3001

### Distributed Mode
For horizontal scaling with Redis:

```bash
# Start 2 nodes (default)
./start-distributed.sh

# Start 3 nodes
./start-distributed.sh 3

# Stop all nodes
./start-distributed.sh stop
```

## Running Options

### 1. Standalone Mode (Recommended for Development)
- No Redis required
- Single process
- Full functionality except distributed features
- Perfect for development and testing

```bash
# Using the start script
./start-server.sh

# Or directly
npm run server

# Or with custom port
PORT=8080 npm run server
```

### 2. Distributed Mode (For Production)
- Requires Redis
- Multiple nodes for load balancing
- Automatic failover
- Horizontal scaling

```bash
# First, ensure Redis is running
redis-server

# Then start distributed mode
./start-distributed.sh

# Or manually
DISTRIBUTED_MODE=true NODE_ID=node-1 npm run server
```

### 3. Development Mode
Hot reload for development:

```bash
npm run server:dev
```

## API Endpoints

### Health Check
```bash
curl http://localhost:3001/api/v1/health
```

### Execute Task
```bash
curl -X POST http://localhost:3001/api/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "task": {
      "type": "code",
      "payload": {
        "description": "Create a hello world function"
      }
    }
  }'
```

### Get Metrics
```bash
curl http://localhost:3001/api/v1/metrics
```

### Cluster Stats (Distributed Mode Only)
```bash
curl http://localhost:3001/api/v1/cluster/stats
```

## WebSocket Connection

Connect via Socket.io client:

```javascript
const io = require('socket.io-client');
const socket = io('http://localhost:3001');

socket.on('connect', () => {
  console.log('Connected!');
  
  // Execute a task
  socket.emit('task:execute', {
    task: {
      type: 'analysis',
      payload: { data: 'Analyze this code' }
    }
  });
});

socket.on('task:progress', (data) => {
  console.log('Progress:', data);
});

socket.on('task:complete', (result) => {
  console.log('Complete:', result);
});
```

## Environment Variables

Create a `.env` file or set these environment variables:

```env
# Server Configuration
PORT=3001
LOG_LEVEL=info

# API Keys (Required)
CLAUDE_API_KEY=your_claude_api_key
GEMINI_API_KEY=your_gemini_api_key

# Distributed Mode
DISTRIBUTED_MODE=false
NODE_ID=node-1
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Performance
MAX_CONCURRENCY=5
TASK_TIMEOUT=30000

# Security (Optional)
JWT_SECRET=your_secret_key
ENABLE_WS_AUTH=false
CORS_ORIGIN=http://localhost:3000
```

## Troubleshooting

### Redis Connection Error
If you see Redis connection errors in standalone mode:
```bash
# Make sure to use the start script
./start-server.sh

# Or explicitly disable distributed mode
unset DISTRIBUTED_MODE
npm run server
```

### Port Already in Use
```bash
# Find process using port 3001
lsof -i :3001

# Kill the process
kill -9 <PID>
```

### API Key Errors
Make sure your `.env` file contains valid API keys:
- `CLAUDE_API_KEY`: Get from https://console.anthropic.com/
- `GEMINI_API_KEY`: Get from https://makersuite.google.com/app/apikey

## Monitoring

### Logs
- Console output with color coding
- File logs in `bridge-server.log`
- Rotating logs (max 5 files, 10MB each)

### Health Monitoring
```bash
# Simple health check
curl http://localhost:3001/api/v1/health

# Detailed metrics
curl http://localhost:3001/api/v1/metrics
```

### Performance Metrics
The `/api/v1/metrics` endpoint provides:
- Server uptime
- Memory usage
- CPU usage
- Learning module insights
- Cluster statistics (distributed mode)

## Production Deployment

### Using PM2
```bash
# Install PM2
npm install -g pm2

# Start in production
pm2 start dist/server/bridge-server.js --name claude-gemini-bridge

# Start with clustering
pm2 start dist/server/bridge-server.js -i max
```

### Using Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3001
CMD ["node", "dist/server/bridge-server.js"]
```

### Using systemd
Create `/etc/systemd/system/claude-gemini-bridge.service`:
```ini
[Unit]
Description=Claude-Gemini Bridge Server
After=network.target

[Service]
Type=simple
User=nodeuser
WorkingDirectory=/opt/claude-gemini-bridge
ExecStart=/usr/bin/node /opt/claude-gemini-bridge/dist/server/bridge-server.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

## Security Considerations

1. **API Keys**: Never commit API keys. Use environment variables.
2. **CORS**: Configure allowed origins in production
3. **Rate Limiting**: Enabled by default (100 requests per 15 minutes)
4. **Authentication**: Enable JWT auth for WebSocket in production
5. **HTTPS**: Use a reverse proxy (nginx/Apache) for SSL in production

## Support

For issues or questions:
1. Check the logs: `tail -f bridge-server.log`
2. Review the API documentation: http://localhost:3001/api/v1/openapi.json
3. Check the project README and contributing guidelines