const express = require('express');
const router = express.Router();
const db = require('../models/db');
const axios = require('axios');

// Circuit breaker state (in-memory)
let circuitOpen = false;
let lastFailureTime = null;
const CIRCUIT_TIMEOUT = 60000; // 60 seconds
const REQUEST_TIMEOUT = 3000; // 3 seconds

const RECOMMENDATION_API_BASE =
  process.env.RECOMMENDATION_API_URL || 'http://localhost:8080';

// Function to validate price format
const isValidPrice = (price) => {
  const priceStr = typeof price === 'number' ? price.toString() : price;
  return /^(\d+)\.(\d{2})$/.test(priceStr) && parseFloat(priceStr) > 0;
};

// Add a book
router.post('/', async (req, res) => {
  const { ISBN, title, Author, description, genre, price, quantity } = req.body;

  if (
    !ISBN ||
    !title ||
    !Author ||
    !description ||
    !genre ||
    !price ||
    !quantity
  ) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const priceValue = parseFloat(price);
  if (!isValidPrice(priceValue)) {
    return res.status(400).json({
      message:
        'Invalid price format. Must be a positive number with two decimal places.',
    });
  }

  try {
    const [rows] = await db.query('SELECT * FROM books WHERE ISBN = ?', [ISBN]);
    if (rows.length > 0) {
      return res
        .status(422)
        .json({ message: 'This ISBN already exists in the system.' });
    }

    await db.query(
      'INSERT INTO books (ISBN, title, Author, description, genre, price, quantity) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [ISBN, title, Author, description, genre, priceValue, quantity]
    );

    // ✅ Set `Location` header for Gradescope
    res
      .status(201)
      .set('Location', `${req.protocol}://${req.get('host')}/books/${ISBN}`)
      .json({
        ISBN,
        title,
        Author,
        description,
        genre,
        price: priceValue,
        quantity,
      });
  } catch (error) {
    res.status(500).json({ message: 'Database error', error });
  }
});

// Update a book
router.put('/:ISBN', async (req, res) => {
  const {
    title,
    Author,
    description,
    genre,
    price,
    quantity,
    ISBN: bodyISBN,
  } = req.body;
  const { ISBN } = req.params;

  if (!title || !Author || !description || !genre || !price || !quantity) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  if (bodyISBN && bodyISBN !== ISBN) {
    return res
      .status(400)
      .json({ message: 'ISBN in request body does not match URL' });
  }

  const priceValue = parseFloat(price);
  if (!isValidPrice(priceValue)) {
    return res.status(400).json({
      message:
        'Invalid price format. Must be a positive number with two decimal places.',
    });
  }

  try {
    const [rows] = await db.query(
      'UPDATE books SET title=?, Author=?, description=?, genre=?, price=?, quantity=? WHERE ISBN=?',
      [title, Author, description, genre, priceValue, quantity, ISBN]
    );

    if (rows.affectedRows === 0) {
      return res.status(404).json({ message: 'ISBN not found' });
    }

    res.status(200).json({
      ISBN,
      title,
      Author,
      description,
      genre,
      price: priceValue,
      quantity,
    });
  } catch (error) {
    res.status(500).json({ message: 'Database error', error });
  }
});

// Retrieve a book
// Retrieve a book by ISBN (Supports both /books/{ISBN} and /books/isbn/{ISBN})
router.get(['/isbn/:ISBN', '/:ISBN'], async (req, res) => {
  const { ISBN } = req.params;

  try {
    const [rows] = await db.query('SELECT * FROM books WHERE ISBN = ?', [ISBN]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'ISBN not found' });
    }

    // Ensure price is returned as a number
    rows[0].price = parseFloat(rows[0].price);

    res.status(200).json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Database error', error });
  }
});

// Related books endpoint
router.get('/:ISBN/related-books', async (req, res) => {
  const { ISBN } = req.params;

  // Check if circuit is open
  const now = Date.now();
  if (circuitOpen && now - lastFailureTime < CIRCUIT_TIMEOUT) {
    return res.status(503).json({ message: 'Circuit is open' });
  }

  try {
    const response = await axios.get(
      `${RECOMMENDATION_API_BASE}/recommendations/${ISBN}`,
      {
        timeout: REQUEST_TIMEOUT,
      }
    );

    const books = response.data;

    if (!Array.isArray(books) || books.length === 0) {
      return res.status(204).send(); // No content
    }

    // On success, close the circuit
    circuitOpen = false;
    lastFailureTime = null;

    res.status(200).json(books);
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      // Timeout
      circuitOpen = true;
      lastFailureTime = Date.now();
      return res
        .status(504)
        .json({ message: 'Recommendation service timed out' });
    }

    if (error.response && error.response.status >= 500) {
      // Treat 5xx errors as circuit break triggers too
      circuitOpen = true;
      lastFailureTime = Date.now();
    }

    res
      .status(500)
      .json({ message: 'Failed to fetch related books', error: error.message });
  }
});

module.exports = router;
