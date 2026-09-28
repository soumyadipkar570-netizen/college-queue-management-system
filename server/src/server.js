const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { initSocketIO } = require('./sockets/socketManager');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const tokenRoutes = require('./routes/tokenRoutes');
const counterRoutes = require('./routes/counterRoutes');
const queueRoutes = require('./routes/queueRoutes');
const staffRoutes = require('./routes/staffRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
initSocketIO(server);

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    project: 'College Queue Management System (CQMS)',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/tokens', tokenRoutes);
app.use('/api/counters', counterRoutes);
app.use('/api/queues', queueRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

// Serve client production build if available
const clientDistPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

// API 404 Handler for unmatched /api requests
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint '${req.method} ${req.originalUrl}' not found.`
  });
});

// SPA fallback for frontend client-side routes
app.get('*', (req, res) => {
  const indexHtml = path.join(clientDistPath, 'index.html');
  res.sendFile(indexHtml, (err) => {
    if (err) {
      res.status(404).send('CQMS Client build not found. Please run npm run dev in the client directory.');
    }
  });
});

// Central Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 CQMS Server running on http://localhost:${PORT}`);
  console.log(`📚 College Library + 💳 Fees Payment Office Queues`);
  console.log(`====================================================`);
});

module.exports = { app, server };
