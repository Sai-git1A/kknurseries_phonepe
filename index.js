require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const schema = mongoose.Schema;
const sha256 = require('sha256');
const uniq_id = require('uniqid');

const app = express();
let user_data = {
  'name': '',
  'email': '',
  'amount': 0,
  'order_id':'',
  'address': '',
  'phone': '',
  'tx_id': ''
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

mongoose.set('strictQuery', false);
mongoose.connect(process.env.MONGOURL);
mongoose.connection.on('connected', () => {
  console.log('database connected');
});

app.get('/', (req, res) => {
    res.send('Server running Successfully!');
});

app.post('/place-order', (req, res) => {

  const tx_id = uniq_id()

  user_data = {
    'name': req.body.name,
    'email': req.body.email,
    'amount': req.body.price,
    'order_id': req.body.orderId,
    'address': req.body.address,
    'phone': req.body.phone,
    'tx_id': tx_id
  }

  const normalPayLoad = {
    "merchantId": process.env.ID,
    "merchantTransactionId": tx_id,
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
    if (req.body.transactionId == user_data.tx_id && req.body.merchantId == process.env.ID && req.body.amount == user_data.price) {
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
    .then(response => res.send(JSON.stringify(response.data)))
    }
  } else {
    res.send('Payment Failed!');
  }
});

app.listen(process.env.PORT || 8000, (req, res) => {
    console.log('server running successfully');
});