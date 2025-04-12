const express = require('express');
const router = express.Router();
const db = require('../models/db');

// Validate email format
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Validate state abbreviation
const validStates = new Set([
  'AL',
  'AK',
  'AZ',
  'AR',
  'CA',
  'CO',
  'CT',
  'DE',
  'FL',
  'GA',
  'HI',
  'ID',
  'IL',
  'IN',
  'IA',
  'KS',
  'KY',
  'LA',
  'ME',
  'MD',
  'MA',
  'MI',
  'MN',
  'MS',
  'MO',
  'MT',
  'NE',
  'NV',
  'NH',
  'NJ',
  'NM',
  'NY',
  'NC',
  'ND',
  'OH',
  'OK',
  'OR',
  'PA',
  'RI',
  'SC',
  'SD',
  'TN',
  'TX',
  'UT',
  'VT',
  'VA',
  'WA',
  'WV',
  'WI',
  'WY',
]);

// Add customer
router.post('/', async (req, res) => {
  const { userId, name, phone, address, address2, city, state, zipcode } =
    req.body;

  if (!userId || !name || !phone || !address || !city || !state || !zipcode) {
    return res
      .status(400)
      .json({ message: 'All required fields must be provided' });
  }

  if (!isValidEmail(userId)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }

  if (!validStates.has(state)) {
    return res.status(400).json({ message: 'Invalid US state abbreviation' });
  }

  try {
    const [existing] = await db.query(
      'SELECT * FROM customers WHERE userId = ?',
      [userId]
    );
    if (existing.length > 0) {
      return res
        .status(422)
        .json({ message: 'This user ID already exists in the system.' });
    }

    const [result] = await db.query(
      'INSERT INTO customers (userId, name, phone, address, address2, city, state, zipcode) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, name, phone, address, address2, city, state, zipcode]
    );

    const customerId = result.insertId;

    // ✅ Add `Location` header as required by Gradescope
    res
      .status(201)
      .set(
        'Location',
        `${req.protocol}://${req.get('host')}/customers/${customerId}`
      )
      .json({
        id: customerId,
        userId,
        name,
        phone,
        address,
        address2,
        city,
        state,
        zipcode,
      });
  } catch (error) {
    res.status(500).json({ message: 'Database error', error });
  }
});

// Retrieve customer by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ message: 'Invalid customer ID' });
  }

  try {
    const [rows] = await db.query('SELECT * FROM customers WHERE id = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'ID not found' });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Database error', error });
  }
});

// Retrieve customer by user ID
router.get('/', async (req, res) => {
  const { userId } = req.query;

  if (!userId || !isValidEmail(userId)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }

  try {
    const [rows] = await db.query('SELECT * FROM customers WHERE userId = ?', [
      userId,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User-ID not found' });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Database error', error });
  }
});

// ✅ Health Check Endpoint
router.get('/status', (req, res) => {
  res.status(200).send('OK');
});

module.exports = router;
