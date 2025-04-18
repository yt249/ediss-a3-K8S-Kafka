const { Kafka } = require('kafkajs');
const { sendCustomerWelcome } = require('./mailer');

// Kafka configuration
const kafkaConfig = {
  clientId: process.env.KAFKA_CLIENT_ID || 'crm-service',
  brokers: process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',') : ['localhost:9092'],
  ssl: process.env.KAFKA_SSL === 'true',
  sasl: process.env.KAFKA_SASL_USERNAME ? {
    mechanism: 'scram-sha-512',
    username: process.env.KAFKA_SASL_USERNAME,
    password: process.env.KAFKA_SASL_PASSWORD
  } : undefined
};

// Consumer configuration
const consumerConfig = {
  groupId: process.env.KAFKA_GROUP_ID || 'crm-service-group',
  sessionTimeout: 30000,
  heartbeatInterval: 10000,
  maxBytesPerPartition: 1048576 // 1MB
};

// Initialize Kafka client
const kafkaClient = new Kafka(kafkaConfig);

// Create consumer instance
const eventConsumer = kafkaClient.consumer(consumerConfig);

// Connection status
let consumerStatus = {
  connected: false,
  subscribed: false
};

/**
 * Establishes connection to Kafka and subscribes to topic
 */
async function initializeConsumer() {
  if (!consumerStatus.connected) {
    try {
      console.log('[EventConsumer] Connecting to Kafka...');
      await eventConsumer.connect();
      consumerStatus.connected = true;
      
      const topic = process.env.KAFKA_TOPIC || 'customer.events';
      console.log(`[EventConsumer] Subscribing to topic: ${topic}`);
      
      await eventConsumer.subscribe({ 
        topic: topic,
        fromBeginning: true 
      });
      
      consumerStatus.subscribed = true;
      console.log('[EventConsumer] Successfully connected and subscribed');
    } catch (error) {
      console.error('[EventConsumer] Connection failed:', error);
      throw error;
    }
  }
}

/**
 * Processes incoming customer events
 * @param {Object} message - Kafka message
 */
async function processCustomerEvent(message) {
  try {
    const eventData = JSON.parse(message.value.toString());
    console.log(`[EventConsumer] Processing event for customer: ${eventData.userId}`);
    
    const result = await sendCustomerWelcome(eventData);
    if (result) {
      console.log(`[EventConsumer] Welcome message sent to: ${eventData.userId}`);
    } else {
      console.error(`[EventConsumer] Failed to send welcome message to: ${eventData.userId}`);
    }
  } catch (error) {
    console.error('[EventConsumer] Event processing failed:', error);
  }
}

/**
 * Starts the event consumer
 */
async function startEventConsumer() {
  await initializeConsumer();
  
  await eventConsumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      console.log(`[EventConsumer] Received message from ${topic}/${partition}`);
      await processCustomerEvent(message);
    }
  });
  
  console.log('[EventConsumer] Consumer started successfully');
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  if (consumerStatus.connected) {
    await eventConsumer.disconnect();
    console.log('[EventConsumer] Disconnected from Kafka');
  }
  process.exit(0);
});

module.exports = {
  startEventConsumer
}; 