const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const stripe = require("stripe")(process.env.STRIPE_SK);

const app = express();
const port = process.env.PORT || 5000;

// middlewares 
app.use(cors());
app.use(express.json());

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('Unauthorized access')
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send('forbidden access')
        }
        req.decoded = decoded;
        next();
    })
}


// database connection

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bhwsqpg.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// database collections
const usersCollection = client.db('resaleShop').collection('users');
const categoriesCollection = client.db('resaleShop').collection('categories')
const productsCollection = client.db('resaleShop').collection('products')
const bookingsCollection = client.db('resaleShop').collection('bookings')
const paymentsCollection = client.db('resaleShop').collection('payments')

async function run() {
    try {
        // users api
        app.get('/users/role/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            res.send(user)
        })
        app.get('/users/verified', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const result = await usersCollection.findOne(query);
            res.send(result)
        })
        app.get('/users', async (req, res) => {
            const role = req.query.role;
            const query = { role: role };
            const customers = await usersCollection.find(query).toArray();
            res.send(customers)
        })
        app.post('/users', async (req, res) => {
            const user = req.body;
            const previousUser = await usersCollection.findOne({ email: user.email });
            if (previousUser) {
                return res.send({ acknowledged: false })
            }
            const result = await usersCollection.insertOne(user);
            res.send(result)
        })
        app.patch('/users/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: { verified: true }
            };
            const result = await usersCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })
        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(filter);
            res.send(result)
        })

        // json web token sign
        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1d' })
                res.send({ accessToken: token })
            }
        })

        // stripe payment 
        app.post('/create-payment-intent', async (req, res) => {
            const booking = req.body;
            const price = booking.price;
            const amount = price * 100;

            try {
                const paymentIntent = await stripe.paymentIntents.create({
                    currency: 'usd',
                    amount: amount,
                    'payment_method_types': [
                        'card'
                    ]
                })
                res.send({
                    clientSecret: paymentIntent.client_secret
                })
            } catch (error) {
                console.log('errors happend here', error)
            }
        })

        // store payment
        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment);
            const { productId, bookingId, transectionId } = payment;
            // update booking
            const bookingFilter = { _id: ObjectId(bookingId) };
            const updatedDoc = {
                $set: { paid: true, transectionId }
            }
            const bookingUpdate = await bookingsCollection.updateOne(bookingFilter, updatedDoc);
            // delete product form products collection
            const productFilter = { _id: ObjectId(productId) };
            const productUpdatedDoc = {
                $set: { status: 'Sold' }
            }
            const productUpdate = await productsCollection.updateOne(productFilter, productUpdatedDoc);
            res.send(result)
        })

        // categories api
        app.get('/categories', async (req, res) => {
            const query = {};
            const categories = await categoriesCollection.find(query).toArray();
            res.send(categories);
        })
        app.get('/products/:id', async (req, res) => {
            const categoryId = req.params.id;
            const query = { categoryId: categoryId, status: { $ne: "Sold" } }
            const product = await productsCollection.find(query).toArray();
            res.send(product)
        })
        app.get('/myproducts', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const verifiedEmail = req.decoded.email;
            if (email != verifiedEmail) {
                return res.status(403).send({ message: 'Forbidden access' })
            }
            const query = { email: email };
            const products = await productsCollection.find(query).toArray();
            res.send(products)
        })
        app.get('/advertisedproduct', async (req, res) => {
            const query = { advertised: true };
            const products = await productsCollection.find(query).toArray();
            res.send(products);

        })
        app.post('/products', async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.send(result)
        })
        app.patch('/products/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true }
            const updatedDoc = {
                $set: { advertised: req.body.advertised }
            }
            const result = await productsCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });
        app.delete('/products/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(filter);
            res.send(result)
        });
        // reported products api
        app.get('/reportedproducts', async (req, res) => {
            const query = { reported: true };
            const reportedProducts = await productsCollection.find(query).toArray();
            console.log(reportedProducts)
            res.send(reportedProducts);
        })
        app.patch('/reportedproducts/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: { reported: req.body.reported }
            }
            const result = await productsCollection.updateOne(filter, updatedDoc);
            res.send(result)
        })
        app.delete('/reportedproducts/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(filter);
            res.send(result);
        })

        // bookings api
        app.get('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const booking = await bookingsCollection.findOne(query);
            res.send(booking)
        });
        app.get('/bookings', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const verifiedEmail = req.decoded.email;
            if (email !== verifiedEmail) {
                return res.status(403).send({ message: 'Forbidden access' })
            }
            const query = { email: email };
            const bookings = await bookingsCollection.find(query).toArray();
            res.send(bookings)
        });
        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            const result = await bookingsCollection.insertOne(booking);
            const productId = booking.productId;
            const productFilter = { _id: ObjectId(productId) };
            const updatedDoc = {
                $set: { status: 'Booked' }
            }
            const updateProduct = await productsCollection.updateOne(productFilter, updatedDoc)
            res.send(result);
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