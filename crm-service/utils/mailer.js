const nodemailer = require('nodemailer');

// AWS SES configuration
const mailConfig = {
  host: process.env.AWS_SES_HOST || 'email-smtp.us-east-1.amazonaws.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.AWS_SES_SMTP_USER,
    pass: process.env.AWS_SES_SMTP_PASSWORD
  }
};

// Initialize email transporter
const mailTransporter = nodemailer.createTransport(mailConfig);

/**
 * Sends a welcome message to new customers
 * @param {Object} customer - Customer information
 * @returns {Promise<boolean>} Success status
 */
async function sendCustomerWelcome(customer) {
  try {
    console.log(`[Mailer] Preparing welcome message for: ${customer.userId}`);
    
    const message = {
      from: process.env.EMAIL_FROM,
      to: customer.userId,
      subject: 'Welcome to Our Book Store',
      text: `Hello ${customer.name},
Welcome to our book store platform.
Your account has been successfully created.
We're excited to have you join our community!`,
      html: `<h2>Welcome ${customer.name}!</h2>
<p>Welcome to our book store platform.</p>
<p>Your account has been successfully created.</p>
<p>We're excited to have you join our community!</p>`
    };

    console.log(`[Mailer] Sending message to: ${customer.userId}`);
    
    const result = await mailTransporter.sendMail(message);
    
    if (result.accepted?.length > 0) {
      console.log(`[Mailer] Message delivered to: ${result.accepted.join(', ')}`);
    }
    if (result.rejected?.length > 0) {
      console.error(`[Mailer] Message rejected for: ${result.rejected.join(', ')}`);
    }
    
    return true;
  } catch (error) {
    console.error('[Mailer] Error sending message:', error);
    return false;
  }
}

/**
 * Verifies email service connection
 * @returns {Promise<boolean>} Connection status
 */
async function verifyMailConnection() {
  try {
    console.log('[Mailer] Verifying connection...');
    const status = await mailTransporter.verify();
    console.log('[Mailer] Connection verified:', status);
    return true;
  } catch (error) {
    console.error('[Mailer] Connection verification failed:', error);
    return false;
  }
}

// Verify connection on startup
verifyMailConnection().catch(error => {
  console.error('[Mailer] Startup verification failed:', error);
});

module.exports = {
  sendCustomerWelcome
}; 