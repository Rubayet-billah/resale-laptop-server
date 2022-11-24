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

// database collections
const usersCollection = client.db('resaleShop').collection('users');
const categoriesCollection = client.db('resaleShop').collection('categories')
const productsCollection = client.db('resaleShop').collection('products')

async function run() {
    try {
        // users api
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result)
        })
        // categories api
        app.get('/categories', async (req, res) => {
            const query = {};
            const categories = await categoriesCollection.find(query).toArray();
            res.send(categories);
        })
        // products api
        app.get('/products', async (req, res) => {
            const query = {};
            const products = await productsCollection.find(query).toArray();
            res.send(products)
        })
        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { categoryId: id }
            const product = await productsCollection.find(query).toArray();
            res.send(product)
        })
    } catch (error) {
        console.log(error)
    }
}

run().catch(err => console.error(err))


app.get('/', (req, res) => {
    res.send('assignment 12 server is running');
})

app.listen(port, () => {
    console.log(`Server is running fine on port ${port}`)
})