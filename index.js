const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;

// midlleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://online-group-study-asgn11.web.app",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
// middleware for verify token

const verifyToken = (req, res, next) => {
  const { token } = req.cookies;
  if (!token) {
    return res.status(401).send({ message: "unauthorize access" });
  }

  jwt.verify(token, process.env.SECRET_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorize no access" });
    }

    req.user = decoded;
    next();
  });
};

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

    //  jwt token related api
    app.post("/api/v1/jwt", (req, res) => {
      const email = req.body;
      const token = jwt.sign(email, process.env.SECRET_TOKEN);
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
        })
        .send({ success: true });
    });
    // clear cookie after logout
    app.post("/api/v1/logout", async (req, res) => {
      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    });

    // get all assignments
    app.get("/api/v1/assignments", async (req, res) => {
      // pagination
      const page = Number(req.query.page);
      const limit = Number(req.query.limit);
      const skip = (page - 1) * limit;
      const difficultyLevel = req.query.difficulty;

      let query = {};
      if (difficultyLevel) {
        query.difficultyLevel = difficultyLevel;
      }

      // total count for pagination
      const count = await assignmentCollection.countDocuments();
      const result = await assignmentCollection
        .find(query)
        .skip(skip)
        .limit(limit)
        .toArray();
      res.send({ result, count });
    });

    // get all submited assignments
    app.get(
      "/api/v1/user/submitted-assignments",
      verifyToken,
      async (req, res) => {
        const status = req.query?.status;
        let query = {};
        if (status) {
          query.status = status;
        }

        const result = await submittedAssignmentCollection
          .find(query)
          .toArray();
        res.send(result);
      }
    );
    // get my submited assignments
    app.get("/api/v1/user/my-assignments", verifyToken, async (req, res) => {
      const email = req.query?.email;
      const tokenEmail = req.user?.email;

      if (email !== tokenEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }

      const query = { userEmail: email };

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
