const express = require('express');
const bodyParser = require('body-parser');
const bookRoutes = require('./routes/books');
const db = require('./models/db');

const app = express();
app.use(bodyParser.json());

app.use('/books', bookRoutes);

app.get('/status', (req, res) => res.status(200).send('OK'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Book service listening on port ${PORT}`));
