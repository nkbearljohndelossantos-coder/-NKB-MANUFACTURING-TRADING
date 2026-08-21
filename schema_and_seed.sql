-- NKB COSMETICS MANUFACTURING & TRADING ERP
-- Production MySQL Schema & Master Seed Dump
-- Target: Hostinger phpMyAdmin (MySQL 8.0+ / MariaDB 10.5+)

SET FOREIGN_KEY_CHECKS = 0;

-- 1. USERS
DROP TABLE IF EXISTS users;
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  role VARCHAR(50) NOT NULL DEFAULT 'CLIENT',
  client_id INT NULL,
  status INT NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. CATEGORIES
DROP TABLE IF EXISTS b2b_categories;
CREATE TABLE b2b_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. PRODUCTS
DROP TABLE IF EXISTS b2b_products;
CREATE TABLE b2b_products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  sku VARCHAR(50) NOT NULL UNIQUE,
  product_name VARCHAR(200) NOT NULL,
  description TEXT,
  unit_of_measure VARCHAR(20) NOT NULL DEFAULT 'Pieces',
  unit_price DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  min_order_qty INT NOT NULL DEFAULT 1,
  current_stock INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES b2b_categories(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. CLIENTS
DROP TABLE IF EXISTS b2b_clients;
CREATE TABLE b2b_clients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_code VARCHAR(50) NOT NULL UNIQUE,
  company_name VARCHAR(200) NOT NULL,
  contact_person VARCHAR(100),
  email VARCHAR(100) NOT NULL,
  phone VARCHAR(50),
  billing_address TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  credit_limit DECIMAL(14,2) NOT NULL DEFAULT 500000.00,
  credit_terms_days INT NOT NULL DEFAULT 30,
  current_balance DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. SALES ORDERS
DROP TABLE IF EXISTS b2b_sales_orders;
CREATE TABLE b2b_sales_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  so_number VARCHAR(50) NOT NULL UNIQUE,
  client_id INT NOT NULL,
  po_number VARCHAR(100) NOT NULL,
  po_document_url VARCHAR(255),
  order_date DATE NOT NULL,
  target_delivery_date DATE,
  total_ordered_qty INT NOT NULL DEFAULT 0,
  total_delivered_qty INT NOT NULL DEFAULT 0,
  total_billable_qty INT NOT NULL DEFAULT 0,
  subtotal_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  discount_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  tax_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  status VARCHAR(50) NOT NULL DEFAULT 'Draft',
  credit_check_status VARCHAR(50) NOT NULL DEFAULT 'Approved',
  delivery_address TEXT NOT NULL,
  notes TEXT,
  created_by INT,
  confirmed_by INT,
  confirmed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES b2b_clients(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. SALES ORDER ITEMS
DROP TABLE IF EXISTS b2b_sales_order_items;
CREATE TABLE b2b_sales_order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sales_order_id INT NOT NULL,
  product_id INT NOT NULL,
  ordered_qty INT NOT NULL,
  delivered_qty INT NOT NULL DEFAULT 0,
  billable_qty INT NOT NULL DEFAULT 0,
  foc_qty INT NOT NULL DEFAULT 0,
  unit_price DECIMAL(14,2) NOT NULL,
  total_price DECIMAL(14,2) NOT NULL,
  item_status VARCHAR(50) NOT NULL DEFAULT 'Pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (sales_order_id) REFERENCES b2b_sales_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES b2b_products(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. PRODUCT BATCHES
DROP TABLE IF EXISTS b2b_product_batches;
CREATE TABLE b2b_product_batches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  batch_number VARCHAR(100) NOT NULL UNIQUE,
  manufacturing_date DATE NOT NULL,
  expiration_date DATE NOT NULL,
  initial_quantity INT NOT NULL DEFAULT 0,
  remaining_quantity INT NOT NULL DEFAULT 0,
  qc_status VARCHAR(50) NOT NULL DEFAULT 'Passed',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES b2b_products(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. PRODUCTION ORDERS
DROP TABLE IF EXISTS b2b_production_orders;
CREATE TABLE b2b_production_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  production_order_number VARCHAR(50) NOT NULL UNIQUE,
  sales_order_id INT NOT NULL,
  sales_order_item_id INT NOT NULL,
  client_id INT NOT NULL,
  product_id INT NOT NULL,
  batch_id INT NULL,
  batch_number VARCHAR(100) NOT NULL,
  target_quantity INT NOT NULL,
  actual_produced_quantity INT NOT NULL DEFAULT 0,
  planned_start_date DATE NOT NULL,
  actual_start_date DATE,
  planned_end_date DATE,
  actual_end_date DATE,
  production_status VARCHAR(50) NOT NULL DEFAULT 'PLANNED',
  created_by INT,
  remarks TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (sales_order_id) REFERENCES b2b_sales_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (sales_order_item_id) REFERENCES b2b_sales_order_items(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES b2b_clients(id) ON DELETE RESTRICT,
  FOREIGN KEY (product_id) REFERENCES b2b_products(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. PRODUCTION OUTPUTS
DROP TABLE IF EXISTS b2b_production_outputs;
CREATE TABLE b2b_production_outputs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  production_order_id INT NOT NULL,
  batch_id INT NOT NULL,
  output_quantity INT NOT NULL,
  operator_name VARCHAR(150),
  output_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  quality_status VARCHAR(50) NOT NULL DEFAULT 'PASSED',
  inventory_posted_at DATETIME,
  remarks TEXT,
  created_by INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (production_order_id) REFERENCES b2b_production_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (batch_id) REFERENCES b2b_product_batches(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. PRODUCTION VARIANCES
DROP TABLE IF EXISTS b2b_production_variances;
CREATE TABLE b2b_production_variances (
  id INT AUTO_INCREMENT PRIMARY KEY,
  production_order_id INT NOT NULL,
  target_quantity INT NOT NULL,
  actual_produced_quantity INT NOT NULL,
  variance_quantity INT NOT NULL,
  variance_type VARCHAR(50) NOT NULL,
  variance_status VARCHAR(50) NOT NULL DEFAULT 'PENDING_DISPOSITION',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (production_order_id) REFERENCES b2b_production_orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. PRODUCTION DISPOSITIONS
DROP TABLE IF EXISTS b2b_production_dispositions;
CREATE TABLE b2b_production_dispositions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  production_variance_id INT NOT NULL,
  disposition_type VARCHAR(50) NOT NULL,
  allocated_quantity INT NOT NULL,
  approved_by INT,
  approved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  remarks TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (production_variance_id) REFERENCES b2b_production_variances(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. PRODUCTION SHORTAGES
DROP TABLE IF EXISTS b2b_production_shortages;
CREATE TABLE b2b_production_shortages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  production_variance_id INT NOT NULL,
  shortage_quantity INT NOT NULL,
  resolution_type VARCHAR(50) NOT NULL,
  client_accepted BOOLEAN DEFAULT 0,
  resolved_by INT,
  resolved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  remarks TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (production_variance_id) REFERENCES b2b_production_variances(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. DELIVERY RECEIPTS
DROP TABLE IF EXISTS b2b_delivery_receipts;
CREATE TABLE b2b_delivery_receipts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dr_number VARCHAR(50) NOT NULL UNIQUE,
  sales_order_id INT NOT NULL,
  delivery_date DATE NOT NULL,
  driver_name VARCHAR(100),
  vehicle_plate VARCHAR(50),
  delivery_address TEXT NOT NULL,
  total_delivered_qty INT NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'Draft',
  received_by VARCHAR(100),
  received_date DATE,
  received_signature_url VARCHAR(255),
  notes TEXT,
  created_by INT,
  finalized_by INT,
  finalized_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (sales_order_id) REFERENCES b2b_sales_orders(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. DELIVERY RECEIPT ITEMS
DROP TABLE IF EXISTS b2b_delivery_receipt_items;
CREATE TABLE b2b_delivery_receipt_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  delivery_receipt_id INT NOT NULL,
  sales_order_item_id INT NOT NULL,
  product_id INT NOT NULL,
  batch_id INT NULL,
  delivered_qty INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (delivery_receipt_id) REFERENCES b2b_delivery_receipts(id) ON DELETE CASCADE,
  FOREIGN KEY (sales_order_item_id) REFERENCES b2b_sales_order_items(id) ON DELETE RESTRICT,
  FOREIGN KEY (product_id) REFERENCES b2b_products(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. QUANTITY VARIANCES
DROP TABLE IF EXISTS b2b_quantity_variances;
CREATE TABLE b2b_quantity_variances (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sales_order_id INT NOT NULL,
  sales_order_item_id INT NOT NULL,
  delivery_receipt_id INT NOT NULL,
  ordered_qty INT NOT NULL,
  delivered_qty INT NOT NULL,
  variance_qty INT NOT NULL,
  variance_type VARCHAR(50) NOT NULL,
  variance_reason VARCHAR(100) NOT NULL,
  approval_status VARCHAR(50) NOT NULL DEFAULT 'Pending Approval',
  reviewed_by INT,
  approved_by INT,
  approved_treatment VARCHAR(100),
  approved_billable_qty INT,
  approved_foc_qty INT,
  remarks TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (sales_order_id) REFERENCES b2b_sales_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (sales_order_item_id) REFERENCES b2b_sales_order_items(id) ON DELETE CASCADE,
  FOREIGN KEY (delivery_receipt_id) REFERENCES b2b_delivery_receipts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. INVOICES
DROP TABLE IF EXISTS b2b_invoices;
CREATE TABLE b2b_invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  sales_order_id INT NOT NULL,
  delivery_receipt_id INT NOT NULL,
  client_id INT NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  total_billed_qty INT NOT NULL DEFAULT 0,
  total_foc_qty INT NOT NULL DEFAULT 0,
  subtotal_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  tax_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  amount_paid DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  balance_due DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  payment_status VARCHAR(50) NOT NULL DEFAULT 'Unpaid',
  notes TEXT,
  created_by INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (sales_order_id) REFERENCES b2b_sales_orders(id) ON DELETE RESTRICT,
  FOREIGN KEY (delivery_receipt_id) REFERENCES b2b_delivery_receipts(id) ON DELETE RESTRICT,
  FOREIGN KEY (client_id) REFERENCES b2b_clients(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. INVOICE ITEMS
DROP TABLE IF EXISTS b2b_invoice_items;
CREATE TABLE b2b_invoice_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL,
  sales_order_item_id INT NOT NULL,
  product_id INT NOT NULL,
  batch_id INT NULL,
  delivered_qty INT NOT NULL,
  billable_qty INT NOT NULL,
  foc_qty INT NOT NULL DEFAULT 0,
  unit_price DECIMAL(14,2) NOT NULL,
  total_price DECIMAL(14,2) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES b2b_invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (sales_order_item_id) REFERENCES b2b_sales_order_items(id) ON DELETE RESTRICT,
  FOREIGN KEY (product_id) REFERENCES b2b_products(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. PAYMENTS
DROP TABLE IF EXISTS b2b_payments;
CREATE TABLE b2b_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payment_number VARCHAR(50) NOT NULL UNIQUE,
  invoice_id INT NOT NULL,
  client_id INT NOT NULL,
  payment_date DATE NOT NULL,
  amount_paid DECIMAL(14,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  reference_number VARCHAR(100),
  bank_name VARCHAR(100),
  payment_proof_url VARCHAR(255),
  notes TEXT,
  received_by INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES b2b_invoices(id) ON DELETE RESTRICT,
  FOREIGN KEY (client_id) REFERENCES b2b_clients(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. INVENTORY TRANSACTIONS
DROP TABLE IF EXISTS b2b_inventory_transactions;
CREATE TABLE b2b_inventory_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  batch_id INT NULL,
  transaction_type VARCHAR(50) NOT NULL,
  quantity INT NOT NULL,
  reference_type VARCHAR(50) NOT NULL,
  reference_id INT NOT NULL,
  notes TEXT,
  created_by INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES b2b_products(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 20. CUSTOMER AR LEDGER
DROP TABLE IF EXISTS b2b_customer_ledger;
CREATE TABLE b2b_customer_ledger (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  transaction_date DATE NOT NULL,
  transaction_type VARCHAR(50) NOT NULL,
  reference_no VARCHAR(100) NOT NULL,
  debit DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  credit DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  running_balance DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  description TEXT,
  created_by INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES b2b_clients(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 21. AUDIT LOGS
DROP TABLE IF EXISTS b2b_audit_logs;
CREATE TABLE b2b_audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(100) NOT NULL,
  module VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id INT NOT NULL,
  old_values LONGTEXT,
  new_values LONGTEXT,
  reason TEXT,
  ip_address VARCHAR(50),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- MASTER SEED DATA
-- ==========================================

-- 1. CATEGORIES
INSERT INTO b2b_categories (id, category_name, description) VALUES
(1, 'Skin Care & Lotions', 'Premium cosmetic formulations for body & skin'),
(2, 'Serums & Essences', 'Active anti-aging and brightening facial serums'),
(3, 'Facial Cleansers', 'Gentle foaming washes and cleansing milks');

-- 2. PRODUCTS
INSERT INTO b2b_products (id, category_id, sku, product_name, description, unit_of_measure, unit_price, min_order_qty, current_stock, status) VALUES
(1, 1, 'LOT-001', 'Hydrating Body Lotion 500ml', '500ml Vitamin E & Shea Butter Nourishing Body Lotion', 'Bottles', 100.00, 500, 10000, 'ACTIVE'),
(2, 2, 'SER-002', 'Brightening Face Serum 30ml', '30ml Niacinamide 10% + Zinc 1% Radiance Complex', 'Bottles', 180.00, 200, 5000, 'ACTIVE'),
(3, 3, 'CLN-003', 'Gentle Foaming Cleanser 150ml', '150ml pH 5.5 Amino Acid Facial Cleansing Foam', 'Tubes', 120.00, 300, 8000, 'ACTIVE'),
(4, 1, 'SUN-004', 'SPF 50+ Sunscreen Milk 100ml', '100ml Broad Spectrum UVA/UVB Ultra-Light Matte Finish', 'Bottles', 150.00, 500, 6000, 'ACTIVE');

-- 3. CLIENTS
INSERT INTO b2b_clients (id, client_code, company_name, contact_person, email, phone, billing_address, shipping_address, credit_limit, credit_terms_days, current_balance, status) VALUES
(1, 'CLI-001', 'ABC Cosmetics Distribution Inc.', 'Maria Santos', 'client@abccosmetics.com', '+63 917 123 4567', 'Unit 1201 Enterprise Tower, Makati City, Metro Manila', 'NKB Logistics Hub, Warehouse 4B, Calamba, Laguna', 1000000.00, 30, 0.00, 'ACTIVE');

-- 4. USERS (Password: admin123)
INSERT INTO users (id, username, password, full_name, email, role, client_id, status) VALUES
(1, 'admin', '$2a$10$UnyjW5rj9xs8bOutfk1fie.9vNIuoKSRRp4GYDlDNp6eQ8oO8ammW', 'System Administrator', 'admin@nkbmanufacturing.com', 'ADMIN', NULL, 1),
(2, 'manager', '$2a$10$UnyjW5rj9xs8bOutfk1fie.9vNIuoKSRRp4GYDlDNp6eQ8oO8ammW', 'Operations Manager', 'manager@nkbmanufacturing.com', 'MANAGER', NULL, 1),
(3, 'sales', '$2a$10$UnyjW5rj9xs8bOutfk1fie.9vNIuoKSRRp4GYDlDNp6eQ8oO8ammW', 'Senior Sales Executive', 'sales@nkbmanufacturing.com', 'SALES', NULL, 1),
(4, 'production', '$2a$10$UnyjW5rj9xs8bOutfk1fie.9vNIuoKSRRp4GYDlDNp6eQ8oO8ammW', 'Production & Compounding Supervisor', 'production@nkbmanufacturing.com', 'PRODUCTION', NULL, 1),
(5, 'warehouse', '$2a$10$UnyjW5rj9xs8bOutfk1fie.9vNIuoKSRRp4GYDlDNp6eQ8oO8ammW', 'Warehouse Logistics Supervisor', 'warehouse@nkbmanufacturing.com', 'WAREHOUSE', NULL, 1),
(6, 'accounting', '$2a$10$UnyjW5rj9xs8bOutfk1fie.9vNIuoKSRRp4GYDlDNp6eQ8oO8ammW', 'Chief Accountant', 'accounting@nkbmanufacturing.com', 'ACCOUNTING', NULL, 1),
(7, 'client_abc', '$2a$10$UnyjW5rj9xs8bOutfk1fie.9vNIuoKSRRp4GYDlDNp6eQ8oO8ammW', 'Maria Santos (ABC Cosmetics)', 'client@abccosmetics.com', 'CLIENT', 1, 1);

SET FOREIGN_KEY_CHECKS = 1;
