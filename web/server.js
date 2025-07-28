const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = process.env.PORT || 3001

console.log('Starting server...')
console.log('Environment:', dev ? 'development' : 'production')
console.log('Port:', port)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  console.log('Next.js app prepared');
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  // Initialize Socket.IO
  const io = new Server(server, {
    cors: {
      origin: dev ? 'http://localhost:3000' : '*',
      methods: ['GET', 'POST'],
    },
  })

  // WebSocket event handlers
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id)

    socket.on('join', (userId) => {
      socket.join(`user:${userId}`)
      socket.emit('joined', { userId })
    })

    socket.on('task:subscribe', (taskId) => {
      socket.join(`task:${taskId}`)
    })

    socket.on('task:unsubscribe', (taskId) => {
      socket.leave(`task:${taskId}`)
    })

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id)
    })
  })

  // Export io for use in API routes
  global.io = io

  server.listen(port, hostname, (err) => {
    if (err) {
      console.error('Error starting server:', err)
      throw err
    }
    console.log(`> Ready on http://${hostname}:${port}`)
    console.log('> WebSocket server ready')
  })
}).catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})