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
    cb(null,file.originalname);
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
  res.render("insert");
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
  const query = "SELECT * FROM product";
  db.query(query, (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error retrieving products");
    } else {
      res.render("inventory", { products: results });
    }
  });
});

app.get("/logout", (req, res) => {
  res.clearCookie("loggedIn");
  res.redirect("/");
});

app.get("/products/:productId", (req, res) => {
  const productId = req.params.productId;
  const query = "SELECT * FROM product WHERE pid = ?";
  db.query(query, [productId], (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error retrieving product information");
    } else {
      const product = results[0];
      res.render("productInfo", { product });
    }
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

app.put("/products/:productId", (req, res) => {
  const productId = req.params.productId;
  const { cid, bid, sid, pname, p_stock, price, added_date, image } = req.body;
  const query =
    "UPDATE product SET cid = ?, bid = ?, sid = ?, pname = ?, p_stock = ?, price = ?, added_date = ?, image = ? WHERE pid = ?";
  db.query(
    query,
    [cid, bid, sid, pname, p_stock, price, added_date, image, productId],
    (err, result) => {
      if (err) {
        console.error(err);
        res.status(500).send(err.message);
      } else {
        res.status(200).send("Product updated successfully");
      }
    }
  );
});

app.delete("/products/:productId", (req, res) => {
  const productId = req.params.productId;
  const query = "DELETE FROM product WHERE pid = ?";
  db.query(query, [productId], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send(err.message);
    } else {
      res.status(200).send("Product deleted successfully");
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
