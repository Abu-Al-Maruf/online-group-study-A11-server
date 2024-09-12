const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;

// midlleware
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mrrlkes.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

    const assignmentCollection = client
      .db("groupStudy")
      .collection("assignments");
    const submittedAssignmentCollection = client
      .db("groupStudy")
      .collection("submitted_assignment");

    // get all assignments
    app.get("/api/v1/assignments", async (req, res) => {
      const result = await assignmentCollection.find().toArray();
      res.send(result);
    });
    // get all submited assignments
    app.get("/api/v1/user/submitted-assignments", async (req, res) => {
      const email = req.query.email;
      const status = req.query.status;
      let query = {};
      if (email) {
        query.userEmail = email;
      }
      if (status) {
        query.status = status;
      }

      const result = await submittedAssignmentCollection.find(query).toArray();
      res.send(result);
    });

    // get a specific assignments
    app.get("/api/v1/assignments/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await assignmentCollection.findOne(query);
      res.send(result);
    });

    // create assignment
    app.post("/api/v1/user/create-assignment", async (req, res) => {
      const assignment = req.body;
      const result = await assignmentCollection.insertOne(assignment);
      res.send(result);
    });
    // submit assignment
    app.post("/api/v1/user/submitted_assignment", async (req, res) => {
      const assignment = req.body;
      const result = await submittedAssignmentCollection.insertOne(assignment);
      res.send(result);
    });

    // delete assignment
    app.delete("/api/v1/user/delete-assignment/:id", async (req, res) => {
      const id = req.params.id;
      const queryEmail = req.query.email;
      const query = { _id: new ObjectId(id) };
      const findAssignment = await assignmentCollection.findOne(query);
      const dbEmail = findAssignment.email;

      if (queryEmail !== dbEmail) {
        return res.status(401).send({
          message: "You are not authorized to delete this assignment",
        });
      }

      const result = await assignmentCollection.deleteOne(query);
      res.send(result);
    });

    // update assignment
    app.put("/api/v1/user/update-assignment/:id", async (req, res) => {
      const id = req.params.id;
      const assignment = req.body;
      const query = { _id: new ObjectId(id) };
      const findAssignment = await assignmentCollection.findOne(query);
      const dbEmail = findAssignment.email;
      const queryEmail = req.query.email;
      if (queryEmail !== dbEmail) {
        return res.status(401).send({
          message: "You are not authorized to update this assignment",
        });
      }

      const options = { upsert: true };
      const updateDoc = {
        $set: {
          ...assignment,
        },
      };
      const result = await assignmentCollection.updateOne(
        query,
        updateDoc,
        options
      );
      res.send(result);
    });
    // update submitted assignment
    app.put("/api/v1/user/submitted-assignment/:id", async (req, res) => {
      const id = req.params.id;
      const assignment = req.body;
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          obtainMarks: assignment.obtainMarks,
          feedback: assignment.feedback,
          status: assignment.status,
        },
      };
      const result = await submittedAssignmentCollection.updateOne(
        query,
        updateDoc,
        options
      );
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("server is running...");
});

app.listen(port, () => {
  console.log(`server app listening on port ${port}`);
});
