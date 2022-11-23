const express = require('express');
const cors = require('cors');
require('dotenv').config()

const app = express();
const port = process.env.PORT || 5000;

// middlewares 
app.use(cors());
app.use(express.json());

// database connection

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bhwsqpg.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
async function run() {
    try {

    } catch (error) {

    }
}

run().catch(err => console.error(err))


app.get('/', (req, res) => {
    res.send('assignment 12 server is running');
})

app.listen(port, () => {
    console.log(`Server is running fine on port ${port}`)
})