
const express = require('express')
const cors = require('cors')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express()
const port = process.env.PORT || 5000

// middleware

app.use(cors())
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster1.25zkwku.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1`;

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
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    const userCollection = client.db("BookNestDB").collection("users")
    const BookCollection = client.db("BookNestDB").collection("allBooks")
    const BorrowedBooks = client.db("BookNestDB").collection("borrowedBooks")

    app.get('/allBooks',async (req,res) => {
        
        const result = await BookCollection.find().toArray()
        res.send(result)
    })
    app.get('/books/:category',async (req,res) => {
        const category = req.params.category;
        
        const query = {category:category}
       
        const result = await BookCollection.find(query).toArray()
        res.send(result)

    })

    app.get('/bookDetails/:id',async (req,res) => {

        const id = req.params.id
        const query = {_id: new ObjectId(id)};
        // console.log(query)
        const result=await BookCollection.findOne(query)
        res.send(result)
    })



    app.post('/newUser',async (req,res) => {
        const newUser = req.body
        const result = await userCollection.insertOne(newUser)
        res.send(result)

    })

    app.post('/borrowedBooks',async (req,res) => {
        const data = req.body
        const result = await BorrowedBooks.insertOne(data)
        res.send(result)
    })

    app.patch('/books/:id/decrease',async (req,res) => {
        const id = req.params.id
        const result = await BookCollection.updateOne({_id:new ObjectId(id),quantity:{$gt:0}},{$inc:{quantity:-1}})
        if(result.modifiedCount === 0) {
            return res.send({error:'Quantity cannot be less than zero or product not found'})
        }
        res.send(result)

    })
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/',(req,res) => {
    res.send('BookNest is serving')
})

app.listen(port,() => {
    console.log(`server is working on port ${port}`)
})