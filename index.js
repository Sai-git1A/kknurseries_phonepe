require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const schema = mongoose.Schema;
const sha256 = require('sha256');
const uniqid = require('uniqid');

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

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
    const checksum = sha256_val + '###' + 2;

    fetch('https://api.phonepe.com/apis/hermes/pg/v1/pay', {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': checksum,
        'accept': 'application/json',
      },
      body: JSON.stringify({
        request: base64String
      })
    })
    .then(response => response.json())
    .then(data => res.send({result: data}))
});

app.post('/callback', (req, res) => {
  if (req.body.code == 'PAYMENT_SUCCESS' && req.body.merchantId && req.body.transactionId && req.body.providerReferenceId) {
    if (req.body.transactionId) {
      const surl = `https://api.phonepe.com/apis/hermes/pg/v1/status/${process.env.ID}/` + req.body.transactionId;
      
      const string = `/pg/v1/status/${process.env.ID}/` + req.body.transactionId + process.env.KEY;
      
      const sha256_val = sha256(string);
      const checksum = sha256_val + '###' + 2;
      
      fetch(surl, {
      method: 'GET',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': checksum,
        'X-MERCHANT-ID': req.body.transactionId,
        'accept': 'application/json',
      }
    })
    .then(response => response.json())
    .then(data => res.send({result: data}))
    }
  }
});

app.listen(process.env.PORT || 8000, (req, res) => {
    console.log('server listening on port 8000...');
});