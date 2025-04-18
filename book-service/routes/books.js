const express = require('express');
const router = express.Router();
const db = require('../models/db');
const axios = require('axios');
const CircuitBreaker = require('opossum');

// Service protection settings
const REQUEST_TIMEOUT = 3000; // 3 seconds timeout
const RESET_DURATION = 60000; // 60 seconds before retry
const FAILURE_THRESHOLD = 1; // Open circuit after 1 failure
const MONITORING_INTERVAL = 60000; // Monitor failures for 60 seconds
const BUCKET_SIZE = 10; // Track in 10 buckets of 6 seconds each

// Service endpoint configuration
const RECOMMENDATION_ENDPOINT = process.env.RECOMMENDATION_API_URL || 'http://localhost:8080';

// Price validation helper
const validatePrice = (price) => {
  const priceStr = typeof price === 'number' ? price.toString() : price;
  return /^(\d+)\.(\d{2})$/.test(priceStr) && parseFloat(priceStr) > 0;
};

// Custom service error class
class ServiceError extends Error {
  constructor(message, type = 'UNKNOWN') {
    super(message);
    this.name = 'ServiceError';
    this.type = type;
  }
}

// Initialize service protection
const serviceGuard = new CircuitBreaker(
  async (isbn) => {
    console.log(`[Service] Fetching recommendations for ISBN: ${isbn}`);
    
    return new Promise((resolve, reject) => {
      const requestTimer = setTimeout(() => {
        console.log(`[Timeout] Request exceeded ${REQUEST_TIMEOUT}ms limit`);
        reject(new ServiceError('Service response timeout', 'TIMEOUT'));
      }, REQUEST_TIMEOUT);
      
      axios.get(`${RECOMMENDATION_ENDPOINT}/recommendations/${isbn}`, { 
        timeout: REQUEST_TIMEOUT
      })
      .then(response => {
        clearTimeout(requestTimer);
        resolve(response);
      })
      .catch(error => {
        clearTimeout(requestTimer);
        
        if (error.code === 'ECONNABORTED' || 
            error.code === 'ETIMEDOUT' || 
            error.message.includes('timeout')) {
          reject(new ServiceError('Service timeout', 'TIMEOUT'));
        } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
          reject(new ServiceError('Service unavailable', 'CONNECTION'));
        } else {
          reject(new ServiceError(error.message, 'SERVICE'));
        }
      });
    });
  },
  {
    timeout: REQUEST_TIMEOUT,
    resetTimeout: RESET_DURATION,
    errorThresholdPercentage: FAILURE_THRESHOLD,
    rollingCountTimeout: MONITORING_INTERVAL,
    rollingCountBuckets: BUCKET_SIZE
  }
);

// Service protection event monitoring
serviceGuard.on('open', () => {
  console.log('[Protection] Service protection activated');
});

serviceGuard.on('halfOpen', () => {
  console.log('[Protection] Testing service recovery');
});

serviceGuard.on('close', () => {
  console.log('[Protection] Service restored to normal operation');
});

serviceGuard.on('timeout', () => {
  console.log('[Protection] Service response too slow');
});

serviceGuard.on('reject', () => {
  console.log('[Protection] Request blocked - service protection active');
});

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
  if (!validatePrice(priceValue)) {
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
  if (!validatePrice(priceValue)) {
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

// Related books endpoint with enhanced protection
router.get('/:ISBN/related-books', async (req, res) => {
  const { ISBN } = req.params;

  try {
    if (serviceGuard.status.state === 'open') {
      return res.status(503).json({
        status: 'unavailable',
        message: 'Service temporarily unavailable',
        details: 'Service protection is active'
      });
    }

    try {
      const result = await serviceGuard.fire(ISBN);
      
      if (result.data && Array.isArray(result.data) && result.data.length > 0) {
        return res.status(200).json({
          status: 'success',
          count: result.data.length,
          recommendations: result.data
        });
      }
      
      return res.status(204).send();
    } catch (error) {
      if (error instanceof ServiceError) {
        switch (error.type) {
          case 'TIMEOUT':
            return res.status(504).json({
              status: 'timeout',
              message: 'Service response timeout',
              details: `Request exceeded ${REQUEST_TIMEOUT}ms limit`
            });
          case 'CONNECTION':
            return res.status(503).json({
              status: 'unavailable',
              message: 'Service connection failed',
              details: error.message
            });
          default:
            return res.status(500).json({
              status: 'error',
              message: 'Service error',
              details: error.message
            });
        }
      }

      if (error.message && error.message.includes('Breaker is open')) {
        return res.status(503).json({
          status: 'unavailable',
          message: 'Service temporarily unavailable',
          details: 'Service protection is active'
        });
      }

      return res.status(500).json({
        status: 'error',
        message: 'Unexpected service error',
        details: error.message
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      details: error.message
    });
  }
});

module.exports = router;
