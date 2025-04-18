// Load environment configuration
require('dotenv').config();

// Import dependencies
const express = require('express');
const { startEventConsumer } = require('./utils/eventConsumer');

// Initialize application
const app = express();

// Health monitoring endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Service status endpoint
app.get('/status', (req, res) => {
  res.status(200).json({
    service: 'CRM Service',
    status: 'operational',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Start event consumer
startEventConsumer()
  .then(() => {
    console.log('[App] Event consumer started successfully');
  })
  .catch(error => {
    console.error('[App] Failed to start event consumer:', error);
    process.exit(1);
  });

// Start HTTP server
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`[App] CRM Service listening on port ${PORT}`);
});
