const { Kafka } = require('kafkajs');

// Kafka configuration
const kafkaConfig = {
  clientId: 'customer-service-producer',
  brokers: process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',') : ['localhost:9092'],
  ssl: process.env.KAFKA_SSL === 'true',
  sasl: process.env.KAFKA_SASL_USERNAME ? {
    mechanism: 'plain',
    username: process.env.KAFKA_SASL_USERNAME,
    password: process.env.KAFKA_SASL_PASSWORD
  } : undefined
};

// Create Kafka instance
const kafka = new Kafka(kafkaConfig);
const producer = kafka.producer();

// Connection state
let isConnected = false;

/**
 * Initialize Kafka producer connection
 * @returns {Promise<void>}
 */
async function initializeProducer() {
  if (!isConnected) {
    try {
      console.log('Initializing Kafka producer...');
      await producer.connect();
      isConnected = true;
      console.log('Kafka producer connected successfully');
    } catch (error) {
      console.error('Failed to connect to Kafka:', error);
      throw error;
    }
  }
}

/**
 * Publish a customer event to Kafka
 * @param {string} eventType - Type of customer event
 * @param {Object} customerData - Customer data to publish
 * @returns {Promise<boolean>} Success status
 */
async function publishCustomerEvent(eventType, customerData) {
  try {
    await initializeProducer();

    const topic = process.env.KAFKA_TOPIC || 'customer.events';
    const message = {
      type: eventType,
      timestamp: new Date().toISOString(),
      data: customerData
    };

    console.log(`Publishing ${eventType} event to topic ${topic}`);
    console.log('Message payload:', JSON.stringify(message));

    await producer.send({
      topic,
      messages: [
        {
          value: JSON.stringify(message)
        }
      ]
    });

    console.log(`Successfully published ${eventType} event for customer ${customerData.userId}`);
    return true;
  } catch (error) {
    console.error(`Failed to publish ${eventType} event:`, error);
    return false;
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  if (isConnected) {
    try {
      await producer.disconnect();
      console.log('Kafka producer disconnected');
    } catch (error) {
      console.error('Error disconnecting Kafka producer:', error);
    }
  }
  process.exit(0);
});

module.exports = {
  initializeProducer,
  publishCustomerEvent
}; 