-- ─── INVENTORY SETUP ──────────────────────────────────────────
CREATE TABLE inventory (
    product VARCHAR(100) PRIMARY KEY,
    category VARCHAR(50),
    current_stock INT,
    reorder_threshold INT,
    unit_cost FLOAT,
    selling_price FLOAT
);

INSERT INTO inventory (product, category, current_stock, reorder_threshold, unit_cost, selling_price)
VALUES 
('Parle-G', 'Snacks', 400, 50, 4.0, 5.0),
('Maggi', 'Snacks', 150, 30, 10.0, 14.0),
('Aashirvaad Atta 5kg', 'Grains', 15, 10, 180.0, 220.0),
('Fortune Sunflower Oil 1L', 'Oils', 20, 10, 110.0, 140.0),
('Amul Milk 1L', 'Dairy', 100, 20, 55.0, 65.0),
('Tata Salt 1kg', 'Essentials', 200, 40, 15.0, 25.0),
('Red Label Tea 250g', 'Beverages', 50, 15, 90.0, 120.0);

-- ─── SUPPLIERS SETUP (WITH UDHAAR) ──────────────────────────
CREATE TABLE suppliers (
    id INT IDENTITY(1,1) PRIMARY KEY,
    supplier_name VARCHAR(100),
    product VARCHAR(100),
    wholesale_price FLOAT,
    phone_number VARCHAR(15),
    credit_days INT,
    credit_limit FLOAT,
    cash_only BIT,
    delivery_days INT
);

INSERT INTO suppliers (supplier_name, product, wholesale_price, phone_number, credit_days, credit_limit, cash_only, delivery_days)
VALUES 
('Sharma Traders', 'Parle-G', 4.0, '919876543210', 0, 0, 1, 1),
('Raju Wholesalers', 'Parle-G', 4.10, '918765432109', 15, 5000, 0, 2),

('Local Market Daily', 'Maggi', 10.0, '917654321098', 0, 0, 1, 1),
('Kirana Supply Co', 'Maggi', 10.5, '916543210987', 30, 10000, 0, 3),

('Agri Produce Dist', 'Aashirvaad Atta 5kg', 180.0, '915432109876', 0, 0, 1, 1),
('Babu Provisions', 'Aashirvaad Atta 5kg', 185.0, '914321098765', 14, 20000, 0, 2);

-- Note: The sales_data table is auto-created by upload.controller.js when you upload the CSV!
