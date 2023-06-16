const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next)=>{
  const authorization =req.headers.authorization;
  if(!authorization){
    return res.status(401).send({error:true, message:'unauthorized access'});
  }
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
    if(err){
      return res.status(401).send({error:true, message:'unauthorized access'});
    }
    req.decoded = decoded;
    next();
  })
}

// admin ony and and instructor only link secure
const verifyAdmin = async(req, res, next)=>{
  const email = req.decoded.email;
  const query = {email:email}
  const user = await usersCollection.findOne(query);
  if(user?.role == 'admin'){
    return res.status(403).send({error:true, message: 'forbidden message'});
  }
}
const verifyInstructor = async(req, res, next)=>{
  const email = req.decoded.email;
  const query = {email:email}
  const user = await usersCollection.findOne(query);
  if(user?.role == 'instructor'){
    return res.status(403).send({error:true, message: 'forbidden message'});
  }
  next();
}



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.akiedbb.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();

    const usersCollection = client.db("sportifyDb").collection("users");
    const CoursesCollection = client.db("sportifyDb").collection("Courses");
    const cartCollection = client.db("sportifyDb").collection("carts");
    const paymentCollection = client.db("sportifyDb").collection("payments");

    app.post('/jwt', (req, res)=>{
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET,{ expiresIn: '2h' })
      res.send({token})
    })

    // API to get all the courses that's status approved
    app.get('/courses', async (req, res) => {
      const result = await CoursesCollection.find({ status: "approved" }).toArray();
      res.send(result);
    });


    // api to get all the courses that are approved or not
    app.get('/allCourses', async (req, res) => {
      const result = await CoursesCollection.find().toArray();
      res.send(result);
    });


    // api to post a new corse/class by instructor
    app.post('/courses', async(req, res)=>{
       const newClass = req.body
       const result = await CoursesCollection.insertOne(newClass);
       res.send(result);
    })
    

    // Users related APIs
    app.get('/users',  async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // instructor ge api
    app.get('/teachers', async (req, res) => {
      const result = await usersCollection.find({ role: "instructor" }).toArray();
      res.send(result);
    });

    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'User already exists' });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

  //  security layers checking
  // for admin
app.get('/users/admin/:email', verifyJWT, async (req, res) => {
  const email = req.params.email;

  if (req.decoded.email !== email) {
    return res.send({ admin: false });
  }

  const query = { email: email };
  const user = await usersCollection.findOne(query);
  const result = { admin: user?.role === 'admin' };
  res.send(result);
});

// for instructor
app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
  const email = req.params.email;

  if (req.decoded.email !== email) {
    return res.send({ instructor: false });
  }

  const query = { email: email };
  const user = await usersCollection.findOne(query);
  const result = { instructor: user?.role === 'instructor' };
  res.send(result);
});





    // Make admin API
    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'admin'
        }
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Make instructor API
    app.patch('/users/instructor/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'instructor'
        }
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
   

  //  api to approve deny and feedback related
  //approved 
  app.patch('/allCourseS/approved/:id', async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
      $set: {
        status: 'approved'
      }
    };
    const result = await CoursesCollection.updateOne(filter, updateDoc);
    res.send(result);
  });
  // denied
  app.patch('/allCourseS/denied/:id', async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
      $set: {
        status: 'denied'
      }
    };
    const result = await CoursesCollection.updateOne(filter, updateDoc);
    res.send(result);
  });
  // api to feedback 
  app.patch('/allCourseS/feedback/:id', async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
      $set: {
        feedback: req.body.feedback
      }
    };
    const result = await CoursesCollection.updateOne(filter, updateDoc);
    res.send(result);
  });






  // get all the instructors api 
  app.get('/instructors', async (req, res) => {
    const query = { role: 'instructor' };
    const instructors = await usersCollection.find(query).toArray();
  
    res.send(instructors);
  });

    // Classes related APIs, cart collection
    app.get('/carts', verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }

      const decodedEmail = req.decoded.email;
      if(email != decodedEmail){
        return res.status(403).send({error:true, message:"forbidden access"})
      }

      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });

    app.post('/carts', async (req, res) => {
      const item = req.body;
      const result = await cartCollection.insertOne(item);
      res.send(result);
    });

    app.delete('/carts/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = cartCollection.deleteOne(query);
      res.send(result);
    });

     // Get classes for a specific instructor
  app.get('/classes/instructor/:email', async (req, res) => {
    const email = req.params.email;
    const query = { email: email };

    try {
      const result = await CoursesCollection.find(query).toArray();
      res.send(result);
    } catch (error) {
      console.error('Error retrieving classes:', error);
      res.status(500).send({ error: true, message: 'Internal server error' });
    }
  });
    


    // create payment intent
    app.post('/create-payment-intent', async(req, res)=>{
         const {price} = req.body;
         const amount = price*100;
         const paymentIntent = await stripe.paymentIntents.create({
            amount : amount,
            currency: 'usd',
            payment_method_types: ['card']
         });

         res.send({
          clientSecret: paymentIntent.client_secret
         })
    })

    // payment related api
    app.post('/payments', async(req, res)=>{
      const payment = req.body;
      console.log('payment:',payment);
      const insertResult = await paymentCollection.insertOne(payment);

    const query = {_id:{$in:payment.cartItems.map(item => new ObjectId(item))}}
    const deleteResult = await cartCollection.deleteMany(query)


      res.send({insertResult, deleteResult});
    })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send("Sportify is running");
});

app.listen(port, () => {
  console.log(`Sportify is spinning on port ${port}`);
});
