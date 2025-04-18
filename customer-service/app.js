require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initializeProducer } = require('./utils/kafka');
const customerRoutes = require('./routes/customers');

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/customers', customerRoutes);

// Health check endpoint
app.get('/status', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Initialize Kafka producer
    await initializeProducer();
    console.log('Kafka producer initialized');

    // Start HTTP server
    app.listen(PORT, () => {
      console.log(`Customer Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
