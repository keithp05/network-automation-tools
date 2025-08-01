const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const http = require('http');
const { PythonShell } = require('python-shell');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
  }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.sendStatus(401);
  }
  
  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Routes
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  
  // TODO: Implement proper authentication
  if (username && password) {
    const token = jwt.sign(
      { username, role: 'engineer' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    
    res.json({ token, user: { username, role: 'engineer' } });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Network scanning endpoint
app.post('/api/scan/network', authenticateToken, async (req, res) => {
  const { target, scanTypes, ports } = req.body;
  
  // Validate input
  if (!target) {
    return res.status(400).json({ error: 'Target is required' });
  }
  
  // Log scan request for audit
  console.log(`Scan requested by ${req.user.username} for target: ${target}`);
  
  // Execute Python scanner
  const options = {
    mode: 'json',
    pythonOptions: ['-u'],
    scriptPath: path.join(__dirname, '../network-scanner'),
    args: [
      '--target', target,
      '--scan-types', scanTypes.join(','),
      '--ports', ports?.join(',') || '1-1000'
    ]
  };
  
  PythonShell.run('scanner_cli.py', options, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Scan failed' });
    }
    
    res.json({ results: results[0] });
  });
});

// Throughput testing endpoint
app.post('/api/test/throughput', authenticateToken, async (req, res) => {
  const { server, duration = 10 } = req.body;
  
  if (!server) {
    return res.status(400).json({ error: 'Server is required' });
  }
  
  // TODO: Implement throughput testing
  res.json({
    server,
    duration,
    upload: { bandwidth_mbps: 95.2, bytes_sent: 119000000 },
    download: { bandwidth_mbps: 87.6, bytes_received: 109500000 }
  });
});

// Syslog forwarding endpoint
app.post('/api/syslog/forward', authenticateToken, async (req, res) => {
  const { server, port, protocol, filters } = req.body;
  
  // TODO: Implement syslog forwarding
  res.json({
    status: 'configured',
    server,
    port,
    protocol,
    filters
  });
});

// Cloud integration endpoints
app.get('/api/cloud/aws/inventory', authenticateToken, async (req, res) => {
  // TODO: Implement AWS inventory fetch
  res.json({
    vpcs: [],
    subnets: [],
    instances: [],
    securityGroups: []
  });
});

app.get('/api/cloud/azure/inventory', authenticateToken, async (req, res) => {
  // TODO: Implement Azure inventory fetch
  res.json({
    vnets: [],
    subnets: [],
    vms: [],
    networkSecurityGroups: []
  });
});

// WebSocket for real-time updates
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, decoded) => {
    if (err) return next(new Error('Authentication error'));
    socket.userId = decoded.username;
    next();
  });
});

io.on('connection', (socket) => {
  console.log(`User ${socket.userId} connected`);
  
  socket.on('subscribe:scan', (scanId) => {
    socket.join(`scan:${scanId}`);
  });
  
  socket.on('subscribe:logs', () => {
    socket.join('logs');
  });
  
  socket.on('disconnect', () => {
    console.log(`User ${socket.userId} disconnected`);
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});