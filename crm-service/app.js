require('dotenv').config();
const { Kafka } = require('kafkajs');
const nodemailer = require('nodemailer');

// Kafka config
const kafka = new Kafka({
  clientId: 'crm-service',
  brokers: [process.env.KAFKA_BROKER],
});

const topic = process.env.KAFKA_TOPIC;
const consumer = kafka.consumer({ groupId: 'crm-group' });

// Email config
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Main function
async function start() {
  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: true });

  console.log(`✅ CRM Service is listening to ${topic}...`);

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const customer = JSON.parse(message.value.toString());

        const mailOptions = {
          from: `"Book Store CRM" <${process.env.SMTP_USER}>`,
          to: customer.email,
          subject: 'Activate your book store account',
          text: `Dear ${customer.name},\nWelcome to the Book store created by <your-andrew-id>.\nExceptionally this time we won’t ask you to click a link to activate your account.`,
        };

        await transporter.sendMail(mailOptions);
        console.log(`📧 Sent welcome email to ${customer.email}`);
      } catch (err) {
        console.error('❌ Failed to process message:', err.message);
      }
    },
  });
}

start().catch(console.error);
