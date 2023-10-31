require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const schema = mongoose.Schema;

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors({
  origin: '*',
  method: ['GET', 'POST'],
  credentials: true
}));

mongoose.set('strictQuery', false);
mongoose.connect(process.env.MONGOURL);
mongoose.connection.on('connected', () => {
  console.log('database connected');
});

app.get('/', (req, res) => {
    res.send('Server running at port 8000...')
});

app.listen(process.env.PORT || 8000, (req, res) => {
    console.log('server listening on port 8000...');
});