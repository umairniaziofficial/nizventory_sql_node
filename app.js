const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const mysql = require("mysql2");
const multer = require("multer");
const app = express();
const PORT = 3000;

const db = mysql.createConnection({
  host: "localhost",
  user: "niazi",
  password: "123",
  database: "demo",
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err.stack);
    return;
  }
  console.log("Connected to database.");
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/images/databaseImages");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

app.use(upload.single("productImage"));

const checkAuth = (req, res, next) => {
  if (req.cookies.loggedIn) {
    next();
  } else {
    res.redirect("/");
  }
};

const redirectIfLoggedIn = (req, res, next) => {
  if (req.cookies.loggedIn) {
    res.redirect("/home");
  } else {
    next();
  }
};

app.get("/", redirectIfLoggedIn, (req, res) => {
  res.render("index", { page: "login" });
});

app.get("/signup", redirectIfLoggedIn, (req, res) => {
  res.render("index", { page: "signup" });
});

app.get("/home", checkAuth, (req, res) => {
  res.render("home");
});

app.get("/insert", checkAuth, (req, res) => {
  const categoryQuery = "SELECT cid, category_name FROM categories";
  const brandQuery = "SELECT bid, bname FROM brands";
  const storeQuery = "SELECT * FROM stores";

  db.query(categoryQuery, (err1, categories) => {
    if (err1) {
      console.error("Error retrieving categories:", err1);
      res.status(500).send("Error retrieving categories");
      return;
    }

    db.query(brandQuery, (err2, brands) => {
      if (err2) {
        console.error("Error retrieving brands:", err2);
        res.status(500).send("Error retrieving brands");
        return;
      }

      db.query(storeQuery, (err3, stores) => {
        if (err3) {
          console.error("Error retrieving stores:", err3);
          res.status(500).send("Error retrieving stores");
          return;
        }

        res.render("insert", { categories, brands, stores });
      });
    });
  });
});


app.get("/products", checkAuth, (req, res) => {
  const query = `
    SELECT 
      p.pid,
      c.category_name AS category,
      p.bid,
      p.sid,
      p.pname,
      p.p_stock,
      p.price,
      p.added_date,
      p.image
    FROM 
      Product p
    JOIN
      categories c ON p.cid = c.cid;
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error retrieving products");
    } else {
      res.render("products", { products: results });
    }
  });
});

app.get("/inventory", checkAuth, (req, res) => {
  const productsQuery = `
    SELECT 
      p.pid,
      c.category_name AS category,
      p.bid,
      p.sid,
      p.pname,
      p.p_stock,
      p.price,
      p.added_date,
      p.image
    FROM 
      Product p
    JOIN
      categories c ON p.cid = c.cid;
  `;

  const storesQuery = `SELECT * FROM stores`;

  db.query(productsQuery, (err1, products) => {
    if (err1) {
      console.error(err1);
      return res.status(500).send("Error retrieving products");
    }

    db.query(storesQuery, (err2, stores) => {
      if (err2) {
        console.error(err2);
        return res.status(500).send("Error retrieving stores");
      }

      res.render("inventory", { products, stores }); // Make sure 'stores' is passed here
    });
  });
});



app.get("/logout", (req, res) => {
  res.clearCookie("loggedIn");
  res.redirect("/");
})


app.get("/edit/:pid", checkAuth, (req, res) => {
  const { pid } = req.params;
  const categoryQuery = "SELECT cid, category_name FROM categories";
  const brandQuery = "SELECT bid, bname FROM brands";
  const storeQuery = "SELECT * FROM stores";
  const productQuery = "SELECT * FROM product WHERE pid = ?";

  db.query(categoryQuery, (err1, categories) => {
    if (err1) {
      console.error("Error retrieving categories:", err1);
      res.status(500).send("Error retrieving categories");
      return;
    }

    db.query(brandQuery, (err2, brands) => {
      if (err2) {
        console.error("Error retrieving brands:", err2);
        res.status(500).send("Error retrieving brands");
        return;
      }

      db.query(storeQuery, (err3, stores) => {
        if (err3) {
          console.error("Error retrieving stores:", err3);
          res.status(500).send("Error retrieving stores");
          return;
        }

        db.query(productQuery, [pid], (err4, product) => {
          if (err4) {
            console.error("Error retrieving product:", err4);
            res.status(500).send("Error retrieving product");
            return;
          }

          if (product.length === 0) {
            res.status(404).send("Product not found");
            return;
          }

          res.render("editPage", { categories, brands, stores, product: product[0] });
        });
      });
    });
  });
});

app.post("/edit/:pid", checkAuth, (req, res) => {
  const { pid } = req.params;
  const { cid, bid, sid, pname, p_stock, price, added_date } = req.body;
  const imageName = req.file ? req.file.originalname : null;

  // Update the product in the database
  const updateProductQuery = `
    UPDATE product 
    SET cid = ?, bid = ?, sid = ?, pname = ?, p_stock = ?, price = ?, added_date = ?, image = ? 
    WHERE pid = ?
  `;
  const values = [cid, bid, sid, pname, p_stock, price, added_date, imageName, pid];

  db.query(updateProductQuery, values, (err, result) => {
    if (err) {
      console.error("Error updating product:", err);
      res.status(500).send("Error updating product");
    } else {
      res.redirect("/products");
    }
  });
});



app.post('/delete/:pid', checkAuth, (req, res) => {
  const { pid } = req.params;
  const deleteQuery = 'DELETE FROM Product WHERE pid = ?';

  db.query(deleteQuery, [pid], (err, result) => {
    if (err) {
      console.error('Error deleting product:', err);
      res.status(500).send('Error deleting product');
      return;
    }
    res.redirect('/products');
  });
});


app.post("/insert", (req, res) => {
  const { cid, bid, sid, pname, p_stock, price, added_date } = req.body;
  const imageName = req.file ? req.file.originalname : null;

  const insertIfNotExist = (table, columnName, value, callback) => {
    const checkQuery = `SELECT * FROM ${table} WHERE ${columnName} = ?`;
    db.query(checkQuery, [value], (err, results) => {
      if (err) {
        console.error(err);
        callback(err);
      } else {
        if (results.length === 0) {
          const insertQuery = `INSERT INTO ${table} (${columnName}) VALUES (?)`;
          db.query(insertQuery, [value], (err, result) => {
            if (err) {
              console.error(err);
              callback(err);
            } else {
              callback(null);
            }
          });
        } else {
          callback(null);
        }
      }
    });
  };

  insertIfNotExist("categories", "cid", cid, (err) => {
    if (err) {
      return res.status(500).send(err.message);
    }

    insertIfNotExist("brands", "bid", bid, (err) => {
      if (err) {
        return res.status(500).send(err.message);
      }

      insertIfNotExist("stores", "sid", sid, (err) => {
        if (err) {
          return res.status(500).send(err.message);
        }

        const insertProductQuery =
          "INSERT INTO product (cid, bid, sid, pname, p_stock, price, added_date, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        db.query(
          insertProductQuery,
          [cid, bid, sid, pname, p_stock, price, added_date, imageName],
          (err, result) => {
            if (err) {
              console.error(err);
              return res.status(500).send(err.message);
            } else {
              return res.status(201).send("Product created successfully");
            }
          }
        );
      });
    });
  });
});


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
