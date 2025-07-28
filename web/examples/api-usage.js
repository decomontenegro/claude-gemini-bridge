// Example: Using the Claude-Gemini Bridge Web API

// 1. Execute a task
async function executeTask() {
  const response = await fetch('http://localhost:3000/api/tasks/execute', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'code',
      description: 'Create a TypeScript function to validate email addresses',
      orchestrator: 'auto',
      mode: 'single'
    })
  });

  const result = await response.json();
  console.log('Task result:', result);
  return result.taskId;
}

// 2. Save user configuration
async function saveConfig() {
  const response = await fetch('http://localhost:3000/api/config', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      persona: 'individual',
      preferences: {
        verbosity: 'normal',
        guidance: true,
        automation: 'semi',
        theme: 'dark'
      },
      apiKeys: {
        claude: 'your-claude-api-key',
        gemini: 'your-gemini-api-key'
      }
    })
  });

  const result = await response.json();
  console.log('Config saved:', result);
}

// 3. Get metrics
async function getMetrics() {
  const response = await fetch('http://localhost:3000/api/metrics');
  const data = await response.json();
  
  console.log('Total tasks:', data.metrics.totalTasks);
  console.log('Success rate:', data.metrics.successRate + '%');
  console.log('Insights:', data.metrics.insights);
}

// 4. WebSocket real-time updates
function connectWebSocket(taskId) {
  const socket = io('http://localhost:3000');
  
  socket.on('connect', () => {
    console.log('Connected to WebSocket');
    socket.emit('task:subscribe', taskId);
  });

  socket.on('task:progress', (data) => {
    console.log('Task progress:', data);
  });

  socket.on('task:complete', (data) => {
    console.log('Task completed:', data);
    socket.disconnect();
  });

  socket.on('metrics:update', (metrics) => {
    console.log('New metrics:', metrics);
  });

  socket.on('insight:new', (insight) => {
    console.log('New insight:', insight);
  });
}

// 5. Complete example flow
async function completeExample() {
  try {
    // Save configuration
    await saveConfig();
    
    // Execute a task
    const taskId = await executeTask();
    
    // Connect to WebSocket for real-time updates
    connectWebSocket(taskId);
    
    // Get metrics after some delay
    setTimeout(async () => {
      await getMetrics();
    }, 5000);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the example
completeExample();