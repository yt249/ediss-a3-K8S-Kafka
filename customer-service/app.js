const express = require('express');
const bodyParser = require('body-parser');
const customerRoutes = require('./routes/customers');
const db = require('./models/db');

const app = express();
app.use(bodyParser.json());

app.use('/customers', customerRoutes);

app.get('/status', (req, res) => res.status(200).send('OK'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Customer service listening on port ${PORT}`)
);
