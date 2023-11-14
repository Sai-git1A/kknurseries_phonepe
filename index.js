require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const schema = mongoose.Schema;
const sha256 = require('sha256');

const app = express();
let user_data = {
  'name': '',
  'email': '',
  'amount': 0,
  'order_id':'',
  'address': '',
  'phone': '',
  'date': '',
  'cartData': []
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

mongoose.set('strictQuery', false);
mongoose.connect(process.env.MONGOURL);
mongoose.connection.on('connected', () => {
  console.log('database connected');
});

const paymentStatus = new schema({
  name: String,
  email: String,
  phone: Number,
  address: String,
  amount: Number,
  order_id: String,
  pay_status: String,
  pay_type: String,
  date: String,
  cartDate: Array
});

const indoorSchema = new schema({
  id: String,
  img: String,
  name: String,
  price: Number,
  stock: String,
});

const Payment = mongoose.model('Payment', paymentStatus);
const IndoorPlants = mongoose.model('IndoorPlants', indoorSchema, 'indoor-plants');

app.get('/', (req, res) => {
    res.send('Server running Successfully!');
});

app.get('/indoor-plants', (req, res) => {
  IndoorPlants.find({}, (err, data) => {
    if(err) {
      res.send(err);
    } else {
      res.send(data);
    }
  });
});

app.post('/place-order', (req, res) => {

  user_data = {
    'name': req.body.name,
    'email': req.body.email,
    'amount': req.body.price,
    'order_id': req.body.orderId,
    'address': req.body.address,
    'phone': req.body.phone,
    'date': req.body.date,
    'cartData': req.body.cartData
  }

  const normalPayLoad = {
    "merchantId": process.env.ID,
    "merchantTransactionId": req.body.orderId,
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

app.post('/callback', async (req, res) => {
  try {
    const bodyData = await req.body;

    if (bodyData.code == 'PAYMENT_SUCCESS' && bodyData.merchantId && bodyData.transactionId && bodyData.providerReferenceId) {
      if (bodyData.merchantId == process.env.ID) {
        const surl = `https://api.phonepe.com/apis/hermes/pg/v1/status/${bodyData.merchantId}/` + bodyData.transactionId;
        
        const string = `/pg/v1/status/${process.env.ID}/` + bodyData.transactionId + process.env.KEY;
        
        const sha256_val = sha256(string);
        const checksum = sha256_val + '###' + 2;
        
        fetch(surl, {
        method: 'GET',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': checksum,
          'X-MERCHANT-ID': bodyData.merchantId,
          'accept': 'application/json',
        }
      })
      .then(response => response.json())
      .then(data => {
        const newPayment = new Payment({
          name: user_data.name,
          email: user_data.email,
          phone: user_data.phone,
          address: user_data.address,
          amount: user_data.price,
          order_id: user_data.order_id,
          date: user_data.date,
          cartDate: user_data.cartData,
          pay_status: data.code,
          pay_type: data.data.paymentInstrument.type
        });
        newPayment.save()
          .then(() => {
            res.redirect('https://kknurseries.com/user');
          })
          .catch((error) => {
            console.error('Failed to save data', error);
          });
      })
      } else {
        res.send('ID not found');
      }
    } else {
      const newPayment = new Payment({
        name: user_data.name,
        email: user_data.email,
        phone: user_data.phone,
        address: user_data.address,
        amount: user_data.price,
        order_id: user_data.order_id,
        date: user_data.date,
        cartDate: user_data.cartData,
        pay_status: req.body.code,
        pay_type: 'Null'
      });
      newPayment.save()
        .then(() => {
          res.redirect('https://kknurseries.com/user');
        })
        .catch((error) => {
          console.error('Failed to save data', error);
        });
    }
  } catch (error) {
    res.send(error);
  }
});

app.listen(process.env.PORT || 8000, (req, res) => {
    console.log('server running successfully');
});