const http = require('http');

const port = 3001;

const server = http.createServer((req, res) => {
  console.log(`Request received: ${req.method} ${req.url}`);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Server is working!\n');
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Test server running at http://0.0.0.0:${port}/`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
});