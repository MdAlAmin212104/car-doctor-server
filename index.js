const express = require('express');
const cors = require('cors');
const cookieParser= require ('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 5000;


// middleware 
app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());


const userName = process.env.DB_Name;
const password = process.env.DB_PASS;

const uri = `mongodb+srv://${userName}:${password}@cluster0.ythezyh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "Invalid" })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({message: 'unauthorize Access'})
    }
    req.user = decoded;
    next();
  });
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
        
    const servicesCollection = client.db('carDoctor').collection('services');
    const bookingsCollection = client.db('carDoctor').collection('bookings');
    // user related api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      console.log(user);
      const token =jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.cookie('token', token, {
          httpOnly: true,
          secure: false,
          sameSite: 'strict',
        }).send({ success: true });
    })
    

    // server related api
    app.get('/services', async (req, res) => {
      const courser = servicesCollection.find();
      const result = await courser.toArray();
      res.send(result)
    })
        
    app.get('/services/:serviceId', async (req, res) => {
      const id = req.params.serviceId;
      const query = { _id: new ObjectId(id) }
      const result = await servicesCollection.findOne(query);
      res.send(result);
    })
    


    // bookings service

    app.get('/bookings', verifyToken, async (req, res) => {
      console.log('verify token in user', req.user);
      if (req.query.email !== req.user.email) {
        return res.status(403).send({message: 'forbidden access token'});
      }
      let query = {}
      if (req.query?.email) {
        query = { email: req.query.email }
      }
      const result = await bookingsCollection.find(query).toArray();
      res.send(result);
    })



    app.post('/bookings', async (req, res) => {
      const booking = req.body;
      const result = await bookingsCollection.insertOne(booking);
      res.send(result);
      
    })

    app.patch('/bookings/update/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id : new ObjectId(id) };
      const updateElement = req.body;
      const updateDoc = {
        $set: {
          status : updateElement.status,
        }
      }
      const result = await bookingsCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    app.delete('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const bookings = await bookingsCollection.deleteOne(query);
      res.send(bookings);
    })
        
    
    






    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);






app.get('/', (req, res) => {
      res.send('Car doctor server in running');
})








app.listen(port, () => {
      console.log(`car doctor server listening on ${port}`);
})