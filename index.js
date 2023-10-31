require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const schema = mongoose.Schema;
const axios = require('axios');
const sha256 = require('sha256');
const uniqid = require('uniqid');

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors({
  origin: '*',
  method: ['GET', 'POST'],
  credentials: true
}));

mongoose.set('strictQuery', false);
// mongoose.connect(process.env.MONGOURL);
// mongoose.connection.on('connected', () => {
//   console.log('database connected');
// });

app.get('/', (req, res) => {
    res.send('Server running at port 8000...')
});

app.post('/place-order', (req, res) => {
    const merch_tx_id = uniqid();

    const normalPayLoad = {
      "merchantId": process.env.ID,
      "merchantTransactionId": merch_tx_id,
      "merchantUserId": "KKNURSERIES",
      "amount": req.body.price,
      "redirectUrl": "https://kknurseries-phonepe.vercel.app/callback/",
      "redirectMode": "POST",
      "callbackUrl": "https://kknurseries-phonepe.vercel.app/callback/",
      "mobileNumber": req.body.phone,
      "paymentInstrument": {
        "type": "PAY_PAGE"
      }
    }

    const bufferObj = Buffer.from(JSON.stringify(normalPayLoad), "utf8");
    const base64String = bufferObj.toString("base64");
    const string = base64String + '/pg/v1/pay' + process.env.KEY;
    const sha256_val = sha256(string);
    const checksum = sha256_val + '###' + 1;

    axios.post('https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay', {
    'request': base64String
    }, {
    headers: {
      'Content-Type': 'application/json',
      'X-VERIFY': checksum,
      'accept': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
    })
    .then(function (response) {
      res.redirect(response.data.data.instrumentResponse.redirectInfo.url);
    })
});

app.post('/callback', (req, res) => {
  if (req.body.code == 'PAYMENT_SUCCESS' && req.body.merchantId && req.body.transactionId && req.body.providerReferenceId) {
    if (req.body.transactionId) {
      const surl = `https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/status/${process.env.ID}/` + req.body.transactionId;
      
      const string = `/pg/v1/status/${process.env.ID}/` + req.body.transactionId + process.env.KEY;
      
      const sha256_val = sha256(string);
      const checksum = sha256_val + '###' + 1;
      
      axios.get(surl, {
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': checksum,
          'X-MERCHANT-ID': req.body.transactionId,
          'accept': 'application/json'
        }
      })
      .then(response => res.send(response.data))
    }
  }
});

app.listen(process.env.PORT || 8000, (req, res) => {
    console.log('server listening on port 8000...');
});