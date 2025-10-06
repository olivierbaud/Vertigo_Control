require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocketServer = require('./websocket/server');

// Import routes
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const controllerRoutes = require('./routes/controllers');
const deviceRoutes = require('./routes/devices');
const deviceControlRoutes = require('./routes/device-controls');
const sceneRoutes = require('./routes/scenes');

const app = express();
const PORT = process.env.PORT || 3000;

// Create HTTP server (needed for WebSocket)
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Request logging (simple)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects/:projectId/controllers', controllerRoutes);
app.use('/api/controllers/:controllerId/devices', deviceRoutes);
app.use('/api/devices/:deviceId/controls', deviceControlRoutes);
app.use('/api/controllers/:controllerId/scenes', sceneRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize WebSocket server
const wsServer = new WebSocketServer(server);
wsServer.startHeartbeat();

// Make WebSocket server available to routes
app.set('wsServer', wsServer);

// Start server
server.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV}`);
  console.log(`✓ Health check: http://localhost:${PORT}/health`);
  console.log(`✓ WebSocket: ws://localhost:${PORT}`);
});