const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const sql = require("mssql");
const multer = require("multer");
const app = express();
const PORT = 3000;

const config = {
  user: "admin",
  password: "123",
  server: "DESKTOP-0O8U1BU",
  database: "demo",
  options: {
    trustServerCertificate: true,
    enableArithAbort: true,
    instanceName: "UMAIRKHAN",
  },
  port: 1433,
};

sql
  .connect(config)
  .then(() => console.log("Connected to database"))
  .catch((err) => console.error("Database connection failed:", err));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

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

// Middleware functions
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

// GET Requests
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

  const request = new sql.Request();

  request.query(productsQuery, (err1, products) => {
    if (err1) {
      console.error(err1);
      return res.status(500).send("Error retrieving products");
    }

    request.query(storesQuery, (err2, stores) => {
      if (err2) {
        console.error(err2);
        return res.status(500).send("Error retrieving stores");
      }

      res.render("products", {
        products: products.recordset,
        stores: stores.recordset,
      });
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

  const request = new sql.Request();

  request.query(productsQuery, (err1, products) => {
    if (err1) {
      console.error(err1);
      return res.status(500).send("Error retrieving products");
    }

    request.query(storesQuery, (err2, stores) => {
      if (err2) {
        console.error(err2);
        return res.status(500).send("Error retrieving stores");
      }

      res.render("inventory", {
        products: products.recordset,
        stores: stores.recordset,
      });
    });
  });
});

app.get("/insert", checkAuth, (req, res) => {
  const categoryQuery = "SELECT cid, category_name FROM categories";
  const brandQuery = "SELECT bid, bname FROM brands";
  const storeQuery = "SELECT * FROM stores";

  const request = new sql.Request();

  request.query(categoryQuery, (err1, categories) => {
    if (err1) {
      console.error("Error retrieving categories:", err1);
      res.status(500).send("Error retrieving categories");
      return;
    }

    request.query(brandQuery, (err2, brands) => {
      if (err2) {
        console.error("Error retrieving brands:", err2);
        res.status(500).send("Error retrieving brands");
        return;
      }

      request.query(storeQuery, (err3, stores) => {
        if (err3) {
          console.error("Error retrieving stores:", err3);
          res.status(500).send("Error retrieving stores");
          return;
        }

        res.render("insert", {
          categories: categories.recordset,
          brands: brands.recordset,
          stores: stores.recordset,
        });
      });
    });
  });
});

app.get("/edit/:pid", checkAuth, (req, res) => {
  const { pid } = req.params;
  const categoryQuery = "SELECT cid, category_name FROM categories";
  const brandQuery = "SELECT bid, bname FROM brands";
  const storeQuery = "SELECT * FROM stores";
  const productQuery = "SELECT * FROM product WHERE pid = @pid";

  const request = new sql.Request();

  request.query(categoryQuery, (err1, categories) => {
    if (err1) {
      console.error("Error retrieving categories:", err1);
      res.status(500).send("Error retrieving categories");
      return;
    }

    request.query(brandQuery, (err2, brands) => {
      if (err2) {
        console.error("Error retrieving brands:", err2);
        res.status(500).send("Error retrieving brands");
        return;
      }

      request.query(storeQuery, (err3, stores) => {
        if (err3) {
          console.error("Error retrieving stores:", err3);
          res.status(500).send("Error retrieving stores");
          return;
        }

        request.input("pid", sql.Int, pid);
        request.query(productQuery, (err4, product) => {
          if (err4) {
            console.error("Error retrieving product:", err4);
            res.status(500).send("Error retrieving product");
            return;
          }

          if (product.recordset.length === 0) {
            res.status(404).send("Product not found");
            return;
          }

          res.render("editPage", {
            categories: categories.recordset,
            brands: brands.recordset,
            stores: stores.recordset,
            product: product.recordset[0],
          });
        });
      });
    });
  });
});

app.get("/category", checkAuth, (req, res) => {
  const pageTitle = "Category";
  const query = "SELECT cid, category_name FROM categories";

  const request = new sql.Request();

  request.query(query, (err, data) => {
    if (err) {
      console.error("Error retrieving categories:", err);
      res.status(500).send("Error retrieving categories");
      return;
    }
    res.render("bcs_insertions", { pageTitle, TheData: data.recordset });
  });
});

app.get("/edit/category/:cid", checkAuth, (req, res) => {
  const cid = req.params.cid;
  const categoryQuery =
    "SELECT cid, category_name FROM categories WHERE cid = @cid";
  const pageTitle = "Category";

  const request = new sql.Request();
  request.input("cid", sql.Int, cid);

  request.query(categoryQuery, (err, category) => {
    if (err) {
      console.error("Error retrieving category:", err);
      res.status(500).send("Error retrieving category");
      return;
    }
    res.render("edit_template", {
      category: category.recordset[0],
      pageTitle: pageTitle,
    });
  });
});

app.get("/brand", checkAuth, (req, res) => {
  const pageTitle = "Brand";
  const brandQuery = "SELECT bid, bname FROM brands";

  const request = new sql.Request();

  request.query(brandQuery, (err, brandData) => {
    if (err) {
      console.error("Error retrieving brands:", err);
      res.status(500).send("Error retrieving brands");
      return;
    }
    res.render("bcs_insertions", { pageTitle, TheData: brandData.recordset });
  });
});

app.get("/edit/brand/:bid", checkAuth, (req, res) => {
  const bid = req.params.bid;
  const pageTitle = "Brand";
  const brandQuery = "SELECT bid, bname FROM brands WHERE bid = @bid";

  const request = new sql.Request();
  request.input("bid", sql.Int, bid);

  request.query(brandQuery, (err, brand) => {
    if (err) {
      console.error("Error retrieving brand:", err);
      res.status(500).send("Error retrieving brand");
      return;
    }
    res.render("edit_template", {
      brand: brand.recordset[0],
      pageTitle: pageTitle,
    });
  });
});

app.get("/store", checkAuth, (req, res) => {
  const pageTitle = "Store";
  const query = "SELECT sid, sname, address, mobno FROM stores";

  const request = new sql.Request();

  request.query(query, (err, data) => {
    if (err) {
      console.error("Error retrieving stores:", err);
      res.status(500).send("Error retrieving stores");
      return;
    }
    res.render("bcs_insertions", { pageTitle, TheData: data.recordset });
  });
});

app.get("/edit/store/:sid", checkAuth, (req, res) => {
  const sid = req.params.sid;
  const pageTitle = "Store";
  const storeQuery =
    "SELECT sid, sname, address, mobno FROM stores WHERE sid = @sid";

  const request = new sql.Request();
  request.input("sid", sql.Int, sid);

  request.query(storeQuery, (err, store) => {
    if (err) {
      console.error("Error retrieving store:", err);
      res.status(500).send("Error retrieving store");
      return;
    }
    res.render("edit_template", {
      store: store.recordset[0],
      pageTitle: pageTitle,
    });
  });
});

// ? POST REQUESTS
app.post("/category", (req, res) => {
  const { pname } = req.body;
  const insertCategoryQuery =
    "INSERT INTO categories (category_name) VALUES (@pname)";

  const request = new sql.Request();
  request.input("pname", sql.NVarChar, pname);

  request.query(insertCategoryQuery, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Error adding category");
    } else {
      return res.redirect("/category");
    }
  });
});

app.post("/brand", (req, res) => {
  const { pname } = req.body;
  const insertBrandQuery = "INSERT INTO brands (bname) VALUES (@pname)";

  const request = new sql.Request();
  request.input("pname", sql.NVarChar, pname);

  request.query(insertBrandQuery, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Error adding brand");
    } else {
      return res.status(201).send("Brand added successfully");
    }
  });
});

app.post("/store", (req, res) => {
  const { sname, saddress, snumber } = req.body;
  const insertStoreQuery =
    "INSERT INTO stores (sname, address, mobno) VALUES (@sname, @saddress, @snumber)";

  const request = new sql.Request();
  request.input("sname", sql.NVarChar, sname);
  request.input("saddress", sql.NVarChar, saddress);
  request.input("snumber", sql.NVarChar, snumber);

  request.query(insertStoreQuery, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Error adding store");
    } else {
      return res.status(201).send("Store added successfully");
    }
  });
});

// ? COMPLEX POST REQUESTS

app.post("/edit/category/:cid", (req, res) => {
  const cid = req.params.cid;
  const { category_name } = req.body;

  const updateCategoryQuery =
    "UPDATE categories SET category_name = @category_name WHERE cid = @cid";

  const request = new sql.Request();
  request.input("category_name", sql.NVarChar, category_name);
  request.input("cid", sql.Int, cid);

  request.query(updateCategoryQuery, (err, result) => {
    if (err) {
      console.error("Error updating category:", err);
      res.status(500).send("Error updating category");
      return;
    }
    res.redirect("/category");
  });
});

app.post("/edit/brand/:bid", (req, res) => {
  const bid = req.params.bid;
  const { bname } = req.body;

  const updateBrandQuery = "UPDATE brands SET bname = @bname WHERE bid = @bid";

  const request = new sql.Request();
  request.input("bname", sql.NVarChar, bname);
  request.input("bid", sql.Int, bid);

  request.query(updateBrandQuery, (err, result) => {
    if (err) {
      console.error("Error updating brand:", err);
      res.status(500).send("Error updating brand");
      return;
    }
    res.redirect("/brand");
  });
});

app.post("/edit/store/:sid", (req, res) => {
  const sid = req.params.sid;
  const { sname, saddress, snumber } = req.body;

  const updateStoreQuery =
    "UPDATE stores SET sname = @sname, address = @saddress, mobno = @snumber WHERE sid = @sid";

  const request = new sql.Request();
  request.input("sname", sql.NVarChar, sname);
  request.input("saddress", sql.NVarChar, saddress);
  request.input("snumber", sql.NVarChar, snumber);
  request.input("sid", sql.Int, sid);

  request.query(updateStoreQuery, (err, result) => {
    if (err) {
      console.error("Error updating store:", err);
      res.status(500).send("Error updating store");
      return;
    }
    res.redirect("/store");
  });
});

// ? FOR PRODUCT UPDATE POST REQUEST

app.post("/insert", (req, res) => {
  const { cid, bid, sid, pname, p_stock, price, added_date } = req.body;
  const imageName = req.file ? req.file.originalname : null;

  const insertIfNotExist = (table, columnName, value, callback) => {
    const checkQuery = `SELECT * FROM ${table} WHERE ${columnName} = @value`;

    const request = new sql.Request();
    request.input("value", sql.NVarChar, value);

    request.query(checkQuery, (err, results) => {
      if (err) {
        console.error(err);
        callback(err);
      } else {
        if (results.recordset.length === 0) {
          const insertQuery = `INSERT INTO ${table} (${columnName}) VALUES (@value)`;

          request.query(insertQuery, (err, result) => {
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
          "INSERT INTO product (cid, bid, sid, pname, p_stock, price, added_date, image) VALUES (@cid, @bid, @sid, @pname, @p_stock, @price, @added_date, @imageName)";

        const request = new sql.Request();
        request.input("cid", sql.Int, cid);
        request.input("bid", sql.Int, bid);
        request.input("sid", sql.Int, sid);
        request.input("pname", sql.NVarChar, pname);
        request.input("p_stock", sql.Int, p_stock);
        request.input("price", sql.Decimal, price);
        request.input("added_date", sql.DateTime, added_date);
        request.input("imageName", sql.NVarChar, imageName);

        request.query(insertProductQuery, (err, result) => {
          if (err) {
            console.error(err);
            return res.status(500).send(err.message);
          } else {
            return res.status(201).send("Product created successfully");
          }
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
    SET cid = @cid, bid = @bid, sid = @sid, pname = @pname, p_stock = @p_stock, price = @price, added_date = @added_date, image = @imageName
    WHERE pid = @pid
  `;

  const request = new sql.Request();
  request.input("cid", sql.Int, cid);
  request.input("bid", sql.Int, bid);
  request.input("sid", sql.Int, sid);
  request.input("pname", sql.NVarChar, pname);
  request.input("p_stock", sql.Int, p_stock);
  request.input("price", sql.Decimal, price);
  request.input("added_date", sql.DateTime, added_date);
  request.input("imageName", sql.NVarChar, imageName);
  request.input("pid", sql.Int, pid);

  request.query(updateProductQuery, (err, result) => {
    if (err) {
      console.error("Error updating product:", err);
      res.status(500).send("Error updating product");
    } else {
      res.redirect("/products");
    }
  });
});

// ? HANDLE DELETE REQUESTS
app.post("/delete/category/:cid", checkAuth, (req, res) => {
  const { cid } = req.params;
  const deleteCategoryQuery = "DELETE FROM categories WHERE cid = @cid";

  const request = new sql.Request();
  request.input("cid", sql.Int, cid);

  request.query(deleteCategoryQuery, (err, result) => {
    if (err) {
      console.error("Error deleting category:", err);
      res.status(500).send("Error deleting category");
      return;
    }
    res.redirect("/category");
  });
});

app.post("/delete/brand/:bid", (req, res) => {
  const bid = req.params.bid;

  const deleteBrandQuery = "DELETE FROM brands WHERE bid = @bid";

  const request = new sql.Request();
  request.input("bid", sql.Int, bid);

  request.query(deleteBrandQuery, (err, result) => {
    if (err) {
      console.error("Error deleting brand:", err);
      res.status(500).send("Error deleting brand");
      return;
    }
    res.redirect("/brand");
  });
});

app.post("/delete/store/:sid", checkAuth, (req, res) => {
  const { sid } = req.params;
  const deleteStoreQuery = "DELETE FROM stores WHERE sid = @sid";

  const request = new sql.Request();
  request.input("sid", sql.Int, sid);

  request.query(deleteStoreQuery, (err, result) => {
    if (err) {
      console.error("Error deleting store:", err);
      res.status(500).send("Error deleting store");
      return;
    }
    res.redirect("/store");
  });
});

// ? FOR PRODUCTS DELETION
app.post("/delete/:pid", checkAuth, (req, res) => {
  const { pid } = req.params;
  const deleteQuery = "DELETE FROM Product WHERE pid = @pid";

  const request = new sql.Request();
  request.input("pid", sql.Int, pid);

  request.query(deleteQuery, (err, result) => {
    if (err) {
      console.error("Error deleting product:", err);
      res.status(500).send("Error deleting product");
      return;
    }
    res.redirect("/products");
  });
});

// ? PORT LISTENER

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
