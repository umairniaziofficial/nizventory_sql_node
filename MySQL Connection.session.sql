-- Creating Tables
CREATE TABLE brands (
    bid INT PRIMARY KEY,
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
    cid INT PRIMARY KEY,
    category_name VARCHAR(20)
);

CREATE TABLE stores (
    sid INT PRIMARY KEY,
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
    image BLOB,
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
    cust_id INT PRIMARY KEY,
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
    id INT PRIMARY KEY,
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

-- Sample Data Insertion

INSERT INTO brands (bid, bname) VALUES 
(1, 'Apple'), 
(2, 'Samsung'), 
(3, 'Nike'), 
(4, 'Fortune');

INSERT INTO inv_user (user_id, name, password, last_login, user_type) VALUES
('umair@gmail.com', 'Umair', '123', '2024-05-01 12:00:00', 'admin'),
('hassan@gmail.com', 'Hassan', '1111', '2024-05-01 12:00:00', 'Manager'),
('niazi@gmail.com', 'Niazi', '0011', '2024-05-01 12:00:00', 'Accountant');

INSERT INTO categories (cid, category_name) VALUES
(1, 'Electronics'),
(2, 'Clothing'),
(3, 'Grocery');

INSERT INTO stores (sid, sname, address, mobno) VALUES
(1, 'Store 1', '123 Main St', '123-456-7890'),
(2, 'Store 2', '456 Elm St', '234-567-8901'),
(3, 'Store 3', '789 Oak St', '345-678-9012');

INSERT INTO product (pid, cid, bid, sid, pname, p_stock, price, added_date, image) VALUES
(1, 1, 1, 1, 'iPhone X', 10, 999.99, '2024-05-01', NULL),
(2, 1, 2, 2, 'Samsung Galaxy S20', 8, 899.99, '2024-05-01', NULL),
(3, 2, 3, 1, 'Nike Air Max', 15, 129.99, '2024-05-01', NULL);

INSERT INTO provides (bid, sid, discount) VALUES
(1, 1, 0.1),
(2, 2, 0.05),
(3, 1, 0.15);

INSERT INTO customer_cart (cust_id, name, mobno) VALUES
(1, 'Umair Khan', '555-123-4567'),
(2, 'Hassan Faraz', '555-987-6543');

INSERT INTO select_product (cust_id, pid, quantity) VALUES
(1, 1, 2),
(1, 3, 1),
(2, 2, 1);

INSERT INTO transaction (id, total_amount, paid, due, gst, discount, payment_method, cart_id) VALUES
(1, 1129.97, 1129.97, 0, 50.00, 0, 'Credit Card', 1),
(2, 899.99, 899.99, 0, 39.13, 0, 'PayPal', 2);
