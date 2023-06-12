const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const cors = require('cors');
require('dotenv').config()
const port = process.env.PORT || 5000;


// middleware
app.use(cors());
app.use(express.json());





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

    
    // api to get all the courses
    app.get('/courses', async(req, res)=>{
        const result = await CoursesCollection.find().toArray();
        res.send(result);
    })
  

    // users related api 
    app.post('/users', async(req, res)=>{
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    })
 
  // classes related api, cart collection
  app.get('/carts', async(req, res)=>{
      const email = req.query.email;
      if(!email){
        res.send([]);
      }
      const query = {email:email};
      const result = await cartCollection.find(query).toArray();
      res.send(result);
  });
  app.post('/carts' ,async(req, res)=>{
    const item = req.body;
    const result = await cartCollection.insertOne(item);
    res.send(result);
  })

  app.delete('/carts/:id', async(req, res)=>{
    const id = req.params.id;  
    const query = {_id: new ObjectId(id)};
    const result = cartCollection.deleteOne(query);
    res.send(result);
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








app.get('/', (req, res)=>{
    res.send("spotify is running")
})


app.listen(port, ()=>{
    console.log(`SportifyCamp is spinning on port ${port}`);
})





