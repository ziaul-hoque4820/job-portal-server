const express = require('express');
const cors = require('cors');
const app = express();
const jwt = require('jsonwebtoken');
const cookiesParser = require('cookie-parser');
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

// middlewares
app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true,
}));
app.use(express.json());
app.use(cookiesParser());

const logger = (req, res, next) => {
    console.log('inside the logger middleware:');
    next();
}

const verifyToken = (req, res, next) => {
    const token = req?.cookies?.token;
    console.log('cookie in the middleware', req.cookies);
    if (!token) {
        return res.status(401).send({ error: true, message: 'unauthorized access' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send({ error: true, message: 'forbidden access' });
        }

        req.decoded = decoded;
        next();
    });
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.kogn06a.mongodb.net/?appName=Cluster0`;

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
        const jobsCollection = client.db('jobPortal').collection('jobs');
        const applicationsCollection = client.db('jobPortal').collection('applications');

        // jwt token related api
        app.post('/jwt', async (req, res) => {
            const userData = req.body;
            const token = jwt.sign(userData, process.env.JWT_SECRET, { expiresIn: '1h' });

            // Send token in cookie
            res.cookie('token', token, {
                httpOnly: true,
                secure: false,
            });
            res.send({ success: true });
        })


        // jobs API
        app.get('/jobs', async (req, res) => {
            const email = req.query.email;
            let query = {};
            if (email) {
                query.hr_email = email;
            }
            const cursor = jobsCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })

        app.get('/jobs/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await jobsCollection.findOne(query);
            res.send(result);
        })

        app.post('/jobs', async (req, res) => {
            const newJob = req.body;
            const result = await jobsCollection.insertOne(newJob);
            res.send(result);
        })


        // Job Applicaions related APIs
        app.post('/applications', async (req, res) => {
            const application = req.body;
            const result = await applicationsCollection.insertOne(application);
            res.send(result);
        })

        app.get('/applications', logger, verifyToken, async (req, res) => {
            const email = req.query.email;

            console.log('inside application api', req.cookies);
            if (email !== req.decoded.email) {
                return res.status(403).send({ error: true, message: 'forbidden access' });
            }

            let query = {
                applicantEmail: email
            };
            const result = await applicationsCollection.find(query).toArray();
            res.send(result);
        })

        app.get('/applications/job/:job_id', async (req, res) => {
            const job_id = req.params.job_id;
            let query = {
                jobId: job_id
            };
            const result = await applicationsCollection.find(query).toArray();
            res.send(result);
        })

        app.patch('/applications/:id', async (req, res) => {
            const id = req.params.id;
            const updatedStatus = req.body.status;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    status: updatedStatus
                },
            };
            const result = await applicationsCollection.updateOne(filter, updateDoc);
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





app.get('/', (req, res) => {
    res.send('Job Portal server is run successfully')
});

app.listen(port, () => {
    console.log(`Job Portal server is running on port: ${port}`);
})