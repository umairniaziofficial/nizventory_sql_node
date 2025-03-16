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

// Database initialization function
const initializeDatabase = async () => {
  return new Promise((resolve, reject) => {
    // Check if tables exist by querying the information_schema
    db.query(
      "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'demo' AND table_name = 'product'",
      (err, results) => {
        if (err) {
          return reject(err);
        }
        
        // If product table doesn't exist, create all tables and insert demo data
        if (results[0].count === 0) {
          console.log("Database tables not found. Creating tables and inserting demo data...");
          
          // SQL for creating tables
          const createTablesSQL = `
            -- Creating Tables
            CREATE TABLE brands (
                bid INT AUTO_INCREMENT PRIMARY KEY,
                bname VARCHAR(20)
            );

            CREATE TABLE inv_user (
                user_id VARCHAR(20) PRIMARY KEY,
                name VARCHAR(20),
                password VARCHAR(20),
                last_login TIMESTAMP,
                user_type VARCHAR(10)
            );

            CREATE TABLE categories (
                cid INT AUTO_INCREMENT PRIMARY KEY,
                category_name VARCHAR(20)
            );

            CREATE TABLE stores (
                sid INT AUTO_INCREMENT PRIMARY KEY,
                sname VARCHAR(20),
                address VARCHAR(50),
                mobno VARCHAR(10)
            );

            CREATE TABLE product (
                pid INT AUTO_INCREMENT PRIMARY KEY,
                cid INT,
                bid INT,
                sid INT,
                pname VARCHAR(20),
                p_stock INT,
                price DECIMAL(10, 2),
                added_date DATE,
                image VARCHAR(255),
                FOREIGN KEY (cid) REFERENCES categories(cid),
                FOREIGN KEY (bid) REFERENCES brands(bid),
                FOREIGN KEY (sid) REFERENCES stores(sid)
            );

            CREATE TABLE provides (
                bid INT,
                sid INT,
                discount DECIMAL(5, 2),
                FOREIGN KEY (bid) REFERENCES brands(bid),
                FOREIGN KEY (sid) REFERENCES stores(sid)
            );

            CREATE TABLE customer_cart (
                cust_id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(20),
                mobno VARCHAR(10)
            );

            CREATE TABLE select_product (
                cust_id INT,
                pid INT,
                quantity INT,
                FOREIGN KEY (cust_id) REFERENCES customer_cart(cust_id),
                FOREIGN KEY (pid) REFERENCES product(pid)
            );

            CREATE TABLE transaction (
                id INT AUTO_INCREMENT PRIMARY KEY,
                total_amount DECIMAL(10, 2),
                paid DECIMAL(10, 2),
                due DECIMAL(10, 2),
                gst DECIMAL(5, 2),
                discount DECIMAL(5, 2),
                payment_method VARCHAR(10),
                cart_id INT,
                FOREIGN KEY (cart_id) REFERENCES customer_cart(cust_id)
            );

            CREATE TABLE invoice (
                item_no INT,
                product_name VARCHAR(20),
                quantity INT,
                net_price DECIMAL(10, 2),
                transaction_id INT,
                FOREIGN KEY (transaction_id) REFERENCES transaction(id)
            );
          `;
          
          // SQL for creating procedures and triggers
          const createProceduresAndTriggersSQL = `
            -- Procedures
            CREATE PROCEDURE get_due_amount(IN c_id INT)
            BEGIN
                DECLARE due1 DECIMAL(10, 2);
                SELECT due INTO due1 FROM transaction WHERE cart_id = c_id;
                SELECT due1 AS due_amount;
            END;

            CREATE PROCEDURE show_products()
            BEGIN
                DECLARE done INT DEFAULT 0;
                DECLARE p_id INT;
                DECLARE p_name VARCHAR(20);
                DECLARE p_stock INT;
                DECLARE cur CURSOR FOR SELECT pid, pname, p_stock FROM product;
                DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

                OPEN cur;
                read_loop: LOOP
                    FETCH cur INTO p_id, p_name, p_stock;
                    IF done THEN
                        LEAVE read_loop;
                    END IF;
                    SELECT CONCAT(p_id, ' ', p_name, ' ', p_stock) AS product_details;
                END LOOP;

                CLOSE cur;
            END;

            CREATE PROCEDURE check_stock(IN b INT)
            BEGIN
                DECLARE a INT;
                SELECT p_stock INTO a FROM product WHERE pid = b;
                IF a < 2 THEN
                    SELECT 'Stock is Less' AS stock_status;
                ELSE
                    SELECT 'Enough Stock' AS stock_status;
                END IF;
            END;

            -- Triggers
            CREATE TRIGGER after_select_product_insert
            AFTER INSERT ON select_product
            FOR EACH ROW
            BEGIN
                UPDATE product
                SET p_stock = p_stock - NEW.quantity
                WHERE pid = NEW.pid;
            END;

            CREATE TRIGGER after_transaction_update
            AFTER UPDATE ON transaction
            FOR EACH ROW
            BEGIN
                IF NEW.paid != OLD.paid THEN
                    UPDATE transaction
                    SET due = total_amount - paid
                    WHERE id = NEW.id;
                END IF;
            END;
          `;
          
          // SQL for inserting demo data
          const insertDemoDataSQL = `
            -- Insert demo data into stores
            INSERT INTO stores (sname, address, mobno) VALUES 
            ('Store One', '123 Main St, Cityville', '1234567890'),
            ('Store Two', '456 High St, Townsville', '0987654321'),
            ('Store Three', '789 Market St, Villagetown', '1122334455');

            -- Insert demo data into categories
            INSERT INTO categories (category_name) VALUES 
            ('Electronics'),
            ('Clothing'),
            ('Groceries');

            -- Insert demo data into brands
            INSERT INTO brands (bname) VALUES 
            ('Brand A'),
            ('Brand B'),
            ('Brand C');

            -- Insert demo data into products
            INSERT INTO product (cid, bid, sid, pname, p_stock, price, added_date) VALUES 
            (1, 1, 1, 'Smartphone', 50, 299.99, '2023-05-20'),
            (2, 2, 2, 'Jeans', 100, 49.99, '2023-05-21'),
            (3, 3, 3, 'Apple', 200, 0.99, '2023-05-22');
          `;
          
          // Execute the SQL statements in sequence
          db.query(createTablesSQL, (err) => {
            if (err) {
              console.error("Error creating tables:", err);
              return reject(err);
            }
            
            // Create procedures and triggers with individual statements
            // Using promise-based execution to handle multiple statements
            const executeProceduresAndTriggers = () => {
              return new Promise((resolveProc, rejectProc) => {
                // Split by procedure/trigger definition
                const stmts = createProceduresAndTriggersSQL.split(';');
                
                let currentIndex = 0;
                const executeNextStatement = () => {
                  if (currentIndex >= stmts.length) {
                    resolveProc();
                    return;
                  }
                  
                  const stmt = stmts[currentIndex].trim();
                  currentIndex++;
                  
                  if (!stmt) {
                    executeNextStatement();
                    return;
                  }
                  
                  db.query(stmt + ';', (err) => {
                    if (err) {
                      console.error(`Error executing statement: ${stmt}`, err);
                      rejectProc(err);
                      return;
                    }
                    executeNextStatement();
                  });
                };
                
                executeNextStatement();
              });
            };
            
            executeProceduresAndTriggers()
              .then(() => {
                // Insert demo data
                db.query(insertDemoDataSQL, (err) => {
                  if (err) {
                    console.error("Error inserting demo data:", err);
                    return reject(err);
                  }
                  
                  console.log("Database initialized successfully with tables and demo data!");
                  resolve();
                });
              })
              .catch((err) => {
                reject(err);
              });
          });
        } else {
          console.log("Database tables already exist.");
          resolve();
        }
      }
    );
  });
};

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err.stack);
    return;
  }
  console.log("Connected to database.");
  
  // Initialize database after connection
  initializeDatabase()
    .then(() => {
      console.log("Database initialization complete.");
    })
    .catch((err) => {
      console.error("Error initializing database:", err);
    });
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());


// ? Images save logic and location

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

// ? GET REQUESTS

app.get("/", redirectIfLoggedIn, (req, res) => {
  res.render("index", { page: "login" });
});

app.get("/signup", redirectIfLoggedIn, (req, res) => {
  res.render("index", { page: "signup" });
});

app.get("/logout", (req, res) => {
  res.clearCookie("loggedIn");
  res.redirect("/");
});

app.get("/home", checkAuth, (req, res) => {
  res.render("home");
});

app.get("/products", checkAuth, (req, res) => {
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

      res.render("products", { products, stores });
    });
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

      res.render("inventory", { products, stores });
    });
  });
});
//? GET,POST and DELETE FOR Products

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
              return res.redirect("/products");
            }
          }
        );
      });
    });
  });
});

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

          res.render("editPage", {
            categories,
            brands,
            stores,
            product: product[0],
          });
        });
      });
    });
  });
});

app.post("/edit/:pid", checkAuth, (req, res) => {
  const { pid } = req.params;
  const { cid, bid, sid, pname, p_stock, price, added_date } = req.body;
  const imageName = req.file ? req.file.originalname : null;

  const updateProductQuery = `
    UPDATE product 
    SET cid = ?, bid = ?, sid = ?, pname = ?, p_stock = ?, price = ?, added_date = ?, image = ? 
    WHERE pid = ?
  `;
  const values = [
    cid,
    bid,
    sid,
    pname,
    p_stock,
    price,
    added_date,
    imageName,
    pid,
  ];

  db.query(updateProductQuery, values, (err, result) => {
    if (err) {
      console.error("Error updating product:", err);
      res.status(500).send("Error updating product");
    } else {
      res.redirect("/products");
    }
  });
});

app.post("/delete/:pid", checkAuth, (req, res) => {
  const { pid } = req.params;
  const deleteQuery = "DELETE FROM Product WHERE pid = ?";

  db.query(deleteQuery, [pid], (err, result) => {
    if (err) {
      console.error("Error deleting product:", err);
      res.status(500).send("Error deleting product");
      return;
    }
    res.redirect("/products");
  });
});

//? GET,POST and DELETE FOR Categories

app.get("/category", checkAuth, (req, res) => {
  const pageTitle = "Category";
  const Query = "SELECT cid, category_name FROM categories";

  db.query(Query, (err, Data) => {
    if (err) {
      console.error("Error retrieving brands:", err);
      res.status(500).send("Error retrieving brands");
      return;
    }
    res.render("bcs_insertions", { pageTitle, TheData: Data });
  });
});

app.post("/category", (req, res) => {
  const { pname } = req.body;
  const insertCategoryQuery =
    "INSERT INTO categories (category_name) VALUES (?)";

  db.query(insertCategoryQuery, [pname], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Error adding category");
    } else {
      return res.redirect("/category");
    }
  });
});

app.get("/edit/category/:cid", checkAuth, (req, res) => {
  const cid = req.params.cid;
  const categoryQuery =
    "SELECT cid, category_name FROM categories WHERE cid = ?";
  const pageTitle = "Category";
  db.query(categoryQuery, [cid], (err, category) => {
    if (err) {
      console.error("Error retrieving category:", err);
      res.status(500).send("Error retrieving category");
      return;
    }
    res.render("edit_template", {
      category: category[0],
      pageTitle: pageTitle,
    });
  });
});

app.post("/edit/category/:cid", (req, res) => {
  const cid = req.params.cid;
  const { category_name } = req.body;

  const updateCategoryQuery =
    "UPDATE categories SET category_name = ? WHERE cid = ?";
  db.query(updateCategoryQuery, [category_name, cid], (err, result) => {
    if (err) {
      console.error("Error updating category:", err);
      res.status(500).send("Error updating category");
      return;
    }
    res.redirect("/category");
  });
});

app.post("/delete/category/:cid", checkAuth, (req, res) => {
  const { cid } = req.params;
  const deleteCategoryQuery = "DELETE FROM categories WHERE cid = ?";

  db.query(deleteCategoryQuery, [cid], (err, result) => {
    if (err) {
      console.error("Error deleting category:", err);
      res.status(500).send("Error deleting category");
      return;
    }
    res.redirect("/category");
  });
});


//? GET,POST and DELETE FOR Brands

app.get("/brand", checkAuth, (req, res) => {
  const pageTitle = "Brand";
  const brandQuery = "SELECT bid, bname FROM brands";

  db.query(brandQuery, (err, brandData) => {
    if (err) {
      console.error("Error retrieving brands:", err);
      res.status(500).send("Error retrieving brands");
      return;
    }
    res.render("bcs_insertions", { pageTitle, TheData: brandData });
  });
});

app.post("/brand", (req, res) => {
  const { pname } = req.body;
  const insertBrandQuery = "INSERT INTO brands (bname) VALUES (?)";

  db.query(insertBrandQuery, [pname], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Error adding brand");
    } else {
      return res.redirect("/brand");
    }
  });
});

app.get("/edit/brand/:bid", checkAuth, (req, res) => {
  const bid = req.params.bid;
  const pageTitle = "Brand";
  const brandQuery = "SELECT bid, bname FROM brands WHERE bid = ?";

  db.query(brandQuery, [bid], (err, brand) => {
    if (err) {
      console.error("Error retrieving brand:", err);
      res.status(500).send("Error retrieving brand");
      return;
    }
    res.render("edit_template", { brand: brand[0], pageTitle: pageTitle });
  });
});

app.post("/edit/brand/:bid", (req, res) => {
  const bid = req.params.bid;
  const { bname } = req.body;

  const updateBrandQuery = "UPDATE brands SET bname = ? WHERE bid = ?";

  db.query(updateBrandQuery, [bname, bid], (err, result) => {
    if (err) {
      console.error("Error updating brand:", err);
      res.status(500).send("Error updating brand");
      return;
    }
    res.redirect("/brand");
  });
});

app.post("/delete/brand/:bid", (req, res) => {
  const bid = req.params.bid;

  const deleteBrandQuery = "DELETE FROM brands WHERE bid = ?";

  db.query(deleteBrandQuery, [bid], (err, result) => {
    if (err) {
      console.error("Error deleting brand:", err);
      res.status(500).send("Error deleting brand");
      return;
    }
    res.redirect("/brand");
  });
});

//? GET,POST and DELETE FOR Stores

app.get("/store", checkAuth, (req, res) => {
  const pageTitle = "Store";
  const Query = "SELECT sid,sname, address,mobno FROM stores";

  db.query(Query, (err, Data) => {
    if (err) {
      console.error("Error retrieving brands:", err);
      res.status(500).send("Error retrieving brands");
      return;
    }
    res.render("bcs_insertions", { pageTitle, TheData: Data });
  });
});

app.post("/store", (req, res) => {
  const { sname, saddress, snumber } = req.body;
  const insertStoreQuery =
    "INSERT INTO stores (sname, address, mobno) VALUES (?, ?, ?)";

  db.query(insertStoreQuery, [sname, saddress, snumber], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Error adding store");
    } else {
      return res.redirect("/store");
    }
  });
});

app.get("/edit/store/:sid", checkAuth, (req, res) => {
  const sid = req.params.sid;
  const storeQuery =
    "SELECT sid, sname, address, mobno FROM stores WHERE sid = ?";
  const pageTitle = "Store";
  db.query(storeQuery, [sid], (err, store) => {
    if (err) {
      console.error("Error retrieving store:", err);
      res.status(500).send("Error retrieving store");
      return;
    }
    res.render("edit_template", { store: store[0], pageTitle: pageTitle });
  });
});

app.post("/edit/store/:sid", (req, res) => {
  const sid = req.params.sid;
  const { sname, saddress, snumber } = req.body;

  const updateStoreQuery =
    "UPDATE stores SET sname = ?, address = ?, mobno = ? WHERE sid = ?";

  db.query(updateStoreQuery, [sname, saddress, snumber, sid], (err, result) => {
    if (err) {
      console.error("Error updating store:", err);
      res.status(500).send("Error updating store");
      return;
    }
    res.redirect("/store");
  });
});

app.post("/delete/store/:sid", checkAuth, (req, res) => {
  const { sid } = req.params;
  const deleteCategoryQuery = "DELETE FROM stores WHERE sid = ?";

  db.query(deleteCategoryQuery, [sid], (err, result) => {
    if (err) {
      console.error("Error deleting category:", err);
      res.status(500).send("Error deleting category");
      return;
    }
    res.redirect("/store");
  });
});

// ? PORT Listener

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
