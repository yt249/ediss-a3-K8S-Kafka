const express = require('express');
const db = require('../models/db');
const { publishCustomerEvent } = require('../utils/kafka');
const router = express.Router();

// Validation constants
const VALID_STATES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
]);

// Validation functions
const validateEmail = (email) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
const validateState = (state) => VALID_STATES.has(state);
const validateRequiredFields = (fields) => {
  const required = ['userId', 'name', 'phone', 'address', 'city', 'state', 'zipcode'];
  return required.every(field => fields[field]);
};

// Create new customer
router.post('/', async (req, res) => {
  const customerData = req.body;

  // Input validation
  if (!validateRequiredFields(customerData)) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  if (!validateEmail(customerData.userId)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }

  if (!validateState(customerData.state)) {
    return res.status(400).json({ message: 'Invalid state code' });
  }

  try {
    // Check for duplicate email
    const [existing] = await db.query(
      'SELECT id FROM customers WHERE userId = ?',
      [customerData.userId]
    );

    if (existing.length > 0) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    // Insert new customer
    const [result] = await db.query(
      'INSERT INTO customers (userId, name, phone, address, address2, city, state, zipcode) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        customerData.userId,
        customerData.name,
        customerData.phone,
        customerData.address,
        customerData.address2 || null,
        customerData.city,
        customerData.state,
        customerData.zipcode
      ]
    );

    const newCustomer = {
      id: result.insertId,
      ...customerData
    };

    // Publish event asynchronously
    publishCustomerEvent('customer.registered', newCustomer)
      .catch(err => console.error('Kafka publish error:', err));

    // Return response
    res
      .status(201)
      .set('Location', `${req.protocol}://${req.get('host')}/customers/${result.insertId}`)
      .json(newCustomer);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get customer by ID
router.get('/:id', async (req, res) => {
  const customerId = parseInt(req.params.id);

  if (isNaN(customerId)) {
    return res.status(400).json({ message: 'Invalid customer ID' });
  }

  try {
    const [customers] = await db.query(
      'SELECT * FROM customers WHERE id = ?',
      [customerId]
    );

    if (customers.length === 0) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.json(customers[0]);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get customer by email
router.get('/', async (req, res) => {
  const { userId } = req.query;

  if (!userId || !validateEmail(userId)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }

  try {
    const [customers] = await db.query(
      'SELECT * FROM customers WHERE userId = ?',
      [userId]
    );

    if (customers.length === 0) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.json(customers[0]);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ✅ Health Check Endpoint
router.get('/status', (req, res) => {
  res.status(200).send('OK');
});

module.exports = router;
