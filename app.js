const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const app = express();
const PORT = 3000;

// Set EJS as the templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

// Authentication middleware
const checkAuth = (req, res, next) => {
    if (req.cookies.loggedIn) {
        next();
    } else {
        res.redirect('/');
    }
};

// Redirect if logged in middleware
const redirectIfLoggedIn = (req, res, next) => {
    if (req.cookies.loggedIn) {
        res.redirect('/home');
    } else {
        next();
    }
};

// Routes
app.get('/', redirectIfLoggedIn, (req, res) => {
    res.render('index', { page: 'login' });
});

app.get('/signup', redirectIfLoggedIn, (req, res) => {
    res.render('index', { page: 'signup' });
});

app.get('/home', checkAuth, (req, res) => {
    res.render('home');
});


app.get("/products",checkAuth,(req,res)=>
{
    res.render("products");
});

app.get('/logout', (req, res) => {
    res.clearCookie('loggedIn');
    res.redirect('/');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
