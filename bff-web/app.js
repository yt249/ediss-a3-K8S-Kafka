require('dotenv').config();
const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 80;

const BOOK_SERVICE_URL =
  process.env.BOOK_SERVICE_URL || 'http://localhost:3001';

const CUSTOMER_SERVICE_URL =
  process.env.CUSTOMER_SERVICE_URL || 'http://localhost:3002';

const allowedClientTypes = ['Web', 'web'];

// 🔐 JWT validation middleware
function validateJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer')) {
    return res
      .status(401)
      .json({ message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, 'secret');
    if (
      !decoded.sub ||
      !['starlord', 'gamora', 'drax', 'rocket', 'groot'].includes(decoded.sub)
    ) {
      throw new Error('Invalid sub');
    }

    if (decoded.iss !== 'cmu.edu') {
      throw new Error('Invalid iss');
    }

    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp < now) {
      throw new Error('Token expired');
    }

    req.user = decoded; // attach decoded token to request
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ message: 'Invalid JWT token', error: err.message });
  }
}

// ✅ Health check
app.get('/status', (req, res) => res.status(200).send('OK'));

// 🥇 FIRST: validate the JWT
app.use(validateJWT);
// 📦 Validate X-Client-Type header
app.use((req, res, next) => {
  const clientType = req.headers['x-client-type'];
  if (!clientType || !allowedClientTypes.includes(clientType)) {
    return res
      .status(400)
      .json({ message: 'Invalid or missing X-Client-Type header' });
  }
  req.clientType = clientType;
  next();
});

// 🔀 Proxy to /books endpoint (no mobile logic)
app.use('/books', async (req, res) => {
  try {
    console.log('Forwarding POST /books with body:', req.body);

    const response = await axios({
      method: req.method,
      url: `${BOOK_SERVICE_URL}/books${req.url}`,
      //   headers: req.headers, // ✅ include auth + any custom headers
      data: req.body, // ✅ body for POST/PUT
    });

    console.log('Response from book-service:', response.data);

    res.status(response.status).json(response.data);
  } catch (err) {
    if (err.response) {
      console.error('BFF error:', err.message);

      res.status(err.response.status).json(err.response.data);
    } else if (err.request) {
      res
        .status(504)
        .json({ message: 'Backend did not respond (socket hang up)' });
    } else {
      res.status(500).json({ message: 'Unexpected error in BFF' });
    }
  }
});

// 🔀 Proxy to /customers endpoint (no mobile logic)
app.use('/customers', async (req, res) => {
  try {
    const response = await axios({
      method: req.method,
      url: `${CUSTOMER_SERVICE_URL}/customers${req.url}`,
      //   headers: req.headers, // ✅ include auth + any custom headers
      //   params: req.query, // ✅ preserve query string
      data: req.body,
    });
    console.log(
      'Response from customer-service:',
      response.status,
      response.data
    );
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Forwarding error:', error.message);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else if (error.request) {
      res.status(504).json({
        message: 'Backend did not respond (timeout or socket hang up)',
      });
    } else {
      res.status(500).json({ message: 'Unexpected error in BFF' });
    }
  }
});

app.listen(PORT, () => {
  console.log(`bff-web listening on port ${PORT}`);
});
