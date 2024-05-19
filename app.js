const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const mysql = require('mysql2');
const multer = require('multer'); // Require multer for handling file uploads
const app = express();
const PORT = 3000;

// Database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'niazi',
    password: '123',
    database: 'demo'
});

db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err.stack);
        return;
    }
    console.log('Connected to database.');
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

// Multer Middleware Configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/images'); // Destination folder for storing uploaded images
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname); // Naming convention for uploaded files
    }
});

const upload = multer({ storage: storage });

app.use(upload.single('productImage')); // Use multer to handle file uploads with the input name 'productImage'

const checkAuth = (req, res, next) => {
    if (req.cookies.loggedIn) {
        next();
    } else {
        res.redirect('/');
    }
};

const redirectIfLoggedIn = (req, res, next) => {
    if (req.cookies.loggedIn) {
        res.redirect('/home');
    } else {
        next();
    }
};

app.get('/', redirectIfLoggedIn, (req, res) => {
    res.render('index', { page: 'login' });
});

app.get('/signup', redirectIfLoggedIn, (req, res) => {
    res.render('index', { page: 'signup' });
});

app.get('/home', checkAuth, (req, res) => {
    res.render('home');
});

app.get('/insert', checkAuth, (req, res) => {
    res.render("insert");
});

app.get('/products', checkAuth, (req, res) => {
    const query = 'SELECT * FROM product';
    db.query(query, (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error retrieving products');
        } else {
            res.render('products', { products: results });
        }
    });
});

app.get('/inventory', checkAuth, (req, res) => {
    const query = 'SELECT * FROM product';
    db.query(query, (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error retrieving products');
        } else {
            res.render('inventory', { products: results });
        }
    });
});

app.get('/inventory', checkAuth, (req, res) => {
    res.render('inventory');
});

app.get('/logout', (req, res) => {
    res.clearCookie('loggedIn');
    res.redirect('/');
});

app.get('/products/:productId', (req, res) => {
    const productId = req.params.productId;
    const query = 'SELECT * FROM product WHERE pid = ?';
    db.query(query, [productId], (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error retrieving product information');
        } else {
            const product = results[0]; // Assuming only one product with given ID
            res.render('productInfo', { product });
        }
    });
});

app.post('/products', (req, res) => {
    const { cid, bid, sid, pname, p_stock, price, added_date, image } = req.body;
    const query = 'INSERT INTO product (cid, bid, sid, pname, p_stock, price, added_date, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    db.query(query, [cid, bid, sid, pname, p_stock, price, added_date, image], (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error creating product');
        } else {
            res.status(201).send('Product created successfully');
        }
    });
});

app.post('/insert', (req, res) => {
    // Extracting product details from the request body
    const { productName, category, quantity, location } = req.body;
    const productImage = req.file.filename; // Assuming multer middleware is used to handle file upload

    // Constructing the SQL query to insert the product into the database
    const query = 'INSERT INTO product (pname, cid, p_stock, sid, image) VALUES (?, ?, ?, ?, ?)';

    // Execute the query with the extracted values
    db.query(query, [productName, category, quantity, location, productImage], (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error creating product');
        } else {
            res.status(201).send('Product created successfully');
        }
    });
});

app.put('/products/:productId', (req, res) => {
    const productId = req.params.productId;
    const { cid, bid, sid, pname, p_stock, price, added_date, image } = req.body;
    const query = 'UPDATE product SET cid = ?, bid = ?, sid = ?, pname = ?, p_stock = ?, price = ?, added_date = ?, image = ? WHERE pid = ?';
    db.query(query, [cid, bid, sid, pname, p_stock, price, added_date, image, productId], (err, result) => {
    if (err) {
    console.error(err);
    res.status(500).send('Error updating product');
    } else {
    res.status(200).send('Product updated successfully');
    }
    });
    });
    
    // Route to delete a product
    app.delete('/products/:productId', (req, res) => {
    const productId = req.params.productId;
    const query = 'DELETE FROM product WHERE pid = ?';
    db.query(query, [productId], (err, result) => {
    if (err) {
    console.error(err);
    res.status(500).send('Error deleting product');
    } else {
    res.status(200).send('Product deleted successfully');
    }
    });
    });
    
    app.listen(PORT, () => {
    console.log("Server is running on http://localhost:${PORT}");
    });