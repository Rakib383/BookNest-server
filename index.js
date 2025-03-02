const express = require("express");
const jwt = require("jsonwebtoken");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cookieParser = require("cookie-parser");

const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://booknest-9061c.web.app",
      "https://booknest-9061c.firebaseapp.com",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// middleware
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster1.25zkwku.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    const userCollection = client.db("BookNestDB").collection("users");
    const BookCollection = client.db("BookNestDB").collection("allBooks");
    const BorrowedBooks = client.db("BookNestDB").collection("borrowedBooks");
    const authorCollection = client.db("BookNestDB").collection("authors");

    app.get("/books", async (req, res) => {
      const {categories} = req.query
      // console.log(categories);
      let filter = {}

      if(categories) {
        const categoryArray = categories.split(",").map(cat => cat.trim());
        filter = {category:{$in:categoryArray}}
      }

      const result = await BookCollection.find(filter).toArray()
      
      res.send(result);
    });

    app.get("/latestBooks", async (req, res) => {
      const result = await BookCollection.find().limit(8).toArray();
      res.send(result);
    });

    app.get("/books/:category", async (req, res) => {
      const category = req.params.category;

      const query = { category: category };

      const result = await BookCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/bookDetails/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      // console.log(query)
      const result = await BookCollection.findOne(query);
      res.send(result);
    });

    // authors
    app.get("/authors", async (req, res) => {
      const result = await authorCollection.find().toArray();
      res.send(result);
    });

    app.get("/authors/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      // console.log(query)
      const result = await authorCollection.findOne(query);
      res.send(result);
    });

    app.post("/newUser", async (req, res) => {
      const newUser = req.body;
      const result = await userCollection.insertOne(newUser);
      res.send(result);
    });

    app.post("/borrowedBooks", async (req, res) => {
      const data = req.body;
      const result = await BorrowedBooks.insertOne(data);
      res.send(result);
    });

    app.post("/addBook", verifyToken, async (req, res) => {
      if (req.user.email !== req.query.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const book = req.body;
      const result = await BookCollection.insertOne(book);
      res.send(result);
    });

    app.post("/myBorrowedBooks", async (req, res) => {
      const { email } = req.body;
      const result = await BorrowedBooks.find({
        Borrower_email: email,
      }).toArray();
      res.send(result);
    });

    // auth related APIs
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "8h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    app.post("/logOut", (req, res) => {
      res
        .clearCookie("token", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    app.post("/search", async (req, res) => {
      const { email, _id } = req.body;
      const result = await BorrowedBooks.findOne({
        Borrower_email: email,
        Book_id: _id,
      });
      res.send(result);
    });

    app.patch("/books/:id/increase", async (req, res) => {
      const id = req.params.id;
      const result = await BookCollection.updateOne(
        { _id: new ObjectId(id) },
        { $inc: { quantity: 1 } }
      );
      res.send(result);
    });

    app.patch("/books/:id/decrease", async (req, res) => {
      const id = req.params.id;
      const result = await BookCollection.updateOne(
        { _id: new ObjectId(id), quantity: { $gt: 0 } },
        { $inc: { quantity: -1 } }
      );
      if (result.modifiedCount === 0) {
        return res.send({
          error: "Quantity cannot be less than zero or product not found",
        });
      }
      res.send(result);
    });

    app.patch("/updateBook/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;

      const updateData = {
        $set: data,
      };

      const result = await BookCollection.updateOne(
        { _id: new ObjectId(id) },
        updateData
      );
      res.send(result);
    });

    app.delete("/borrowedBooks/:id", async (req, res) => {
      const id = req.params.id;
      const result = await BorrowedBooks.deleteOne({ Book_id: id });
      res.send(result);
    });
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("BookNest is serving");
});

app.listen(port, () => {
  console.log(`server is working on port ${port}`);
});
