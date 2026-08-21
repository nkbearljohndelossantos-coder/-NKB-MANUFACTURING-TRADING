-- ==============================================================================
-- B2B CLIENT ORDER, DELIVERY, VARIANCE, BILLING & PAYMENT MANAGEMENT DATABASE SCHEMA
-- Target Database: MySQL 8.0+ / MariaDB 10.5+ (Hostinger Compatible)
-- Character Set: utf8mb4 / utf8mb4_unicode_ci
-- ==============================================================================

-- 1. Users table (Enterprise Compatible)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  role VARCHAR(50) NOT NULL DEFAULT 'SALES',
  client_id INT NULL,
  status TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role (role),
  INDEX idx_users_client (client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. B2B Clients Table
CREATE TABLE IF NOT EXISTS b2b_clients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_code VARCHAR(50) NOT NULL UNIQUE,
  company_name VARCHAR(255) NOT NULL,
  tin_number VARCHAR(50) NULL,
  contact_person VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  billing_address TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  credit_limit DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  payment_terms VARCHAR(50) NOT NULL DEFAULT '30 Days',
  credit_status ENUM('Good', 'Warning', 'Blocked') NOT NULL DEFAULT 'Good',
  credit_control_action ENUM('Block Order', 'Require Approval', 'Allow Order') NOT NULL DEFAULT 'Require Approval',
  current_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_b2b_clients_code (client_code),
  INDEX idx_b2b_clients_status (credit_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. B2B Product Categories
CREATE TABLE IF NOT EXISTS b2b_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. B2B Products
CREATE TABLE IF NOT EXISTS b2b_products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sku VARCHAR(100) NOT NULL UNIQUE,
  product_name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  category_id INT NULL,
  category_name VARCHAR(100) DEFAULT 'Cosmetics',
  unit_of_measure VARCHAR(50) NOT NULL DEFAULT 'piece',
  unit_price DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  cost_price DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  current_stock INT NOT NULL DEFAULT 0,
  minimum_stock INT NOT NULL DEFAULT 10,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES b2b_categories(id) ON DELETE SET NULL,
  INDEX idx_b2b_products_sku (sku)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Product Batches / Lots
CREATE TABLE IF NOT EXISTS b2b_product_batches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  batch_number VARCHAR(100) NOT NULL,
  manufacturing_date DATE NULL,
  expiration_date DATE NULL,
  quantity_available INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES b2b_products(id) ON DELETE CASCADE,
  INDEX idx_batch_product (product_id, batch_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Sales Orders
CREATE TABLE IF NOT EXISTS b2b_sales_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  so_number VARCHAR(100) NOT NULL UNIQUE,
  client_id INT NOT NULL,
  po_number VARCHAR(100) NULL,
  order_date DATE NOT NULL,
  requested_delivery_date DATE NULL,
  payment_terms VARCHAR(50) NOT NULL DEFAULT '30 Days',
  delivery_address TEXT NOT NULL,
  salesperson_id INT NULL,
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  status VARCHAR(50) NOT NULL DEFAULT 'Draft',
  credit_check_passed TINYINT(1) NOT NULL DEFAULT 1,
  credit_override_by INT NULL,
  remarks TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES b2b_clients(id) ON DELETE RESTRICT,
  FOREIGN KEY (salesperson_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (credit_override_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_so_number (so_number),
  INDEX idx_so_client (client_id),
  INDEX idx_so_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Sales Order Items
CREATE TABLE IF NOT EXISTS b2b_sales_order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sales_order_id INT NOT NULL,
  product_id INT NOT NULL,
  ordered_qty INT NOT NULL,
  delivered_qty INT NOT NULL DEFAULT 0,
  variance_qty INT NOT NULL DEFAULT 0,
  billable_qty INT NOT NULL DEFAULT 0,
  foc_qty INT NOT NULL DEFAULT 0,
  invoiced_qty INT NOT NULL DEFAULT 0,
  unit_price DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (sales_order_id) REFERENCES b2b_sales_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES b2b_products(id) ON DELETE RESTRICT,
  INDEX idx_so_items_order (sales_order_id),
  INDEX idx_so_items_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Deliveries
CREATE TABLE IF NOT EXISTS b2b_deliveries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  delivery_number VARCHAR(100) NOT NULL UNIQUE,
  sales_order_id INT NOT NULL,
  client_id INT NOT NULL,
  delivery_date DATE NOT NULL,
  driver_name VARCHAR(100) NULL,
  vehicle_plate VARCHAR(50) NULL,
  delivery_address TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Preparing',
  received_by VARCHAR(255) NULL,
  received_date DATETIME NULL,
  remarks TEXT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (sales_order_id) REFERENCES b2b_sales_orders(id) ON DELETE RESTRICT,
  FOREIGN KEY (client_id) REFERENCES b2b_clients(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_del_number (delivery_number),
  INDEX idx_del_so (sales_order_id),
  INDEX idx_del_client (client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Delivery Items
CREATE TABLE IF NOT EXISTS b2b_delivery_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  delivery_id INT NOT NULL,
  sales_order_item_id INT NOT NULL,
  product_id INT NOT NULL,
  batch_id INT NULL,
  ordered_qty INT NOT NULL,
  delivered_qty INT NOT NULL,
  variance_qty INT NOT NULL DEFAULT 0,
  remarks TEXT NULL,
  FOREIGN KEY (delivery_id) REFERENCES b2b_deliveries(id) ON DELETE CASCADE,
  FOREIGN KEY (sales_order_item_id) REFERENCES b2b_sales_order_items(id) ON DELETE RESTRICT,
  FOREIGN KEY (product_id) REFERENCES b2b_products(id) ON DELETE RESTRICT,
  FOREIGN KEY (batch_id) REFERENCES b2b_product_batches(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Quantity Variances
CREATE TABLE IF NOT EXISTS b2b_quantity_variances (
  id INT AUTO_INCREMENT PRIMARY KEY,
  delivery_id INT NOT NULL,
  sales_order_id INT NOT NULL,
  sales_order_item_id INT NOT NULL,
  product_id INT NOT NULL,
  ordered_qty INT NOT NULL,
  delivered_qty INT NOT NULL,
  variance_qty INT NOT NULL,
  variance_type VARCHAR(50) NOT NULL,
  reason VARCHAR(100) NOT NULL,
  proposed_treatment VARCHAR(100) NOT NULL,
  billable_qty INT NOT NULL,
  foc_qty INT NOT NULL,
  approval_status VARCHAR(50) NOT NULL DEFAULT 'Pending Approval',
  manager_id INT NULL,
  approval_date DATETIME NULL,
  approval_remarks TEXT NULL,
  client_confirmation_required TINYINT(1) NOT NULL DEFAULT 0,
  client_confirmation_status VARCHAR(50) NOT NULL DEFAULT 'Pending',
  client_confirmed_by VARCHAR(255) NULL,
  client_confirmation_date DATETIME NULL,
  client_remarks TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (delivery_id) REFERENCES b2b_deliveries(id) ON DELETE RESTRICT,
  FOREIGN KEY (sales_order_id) REFERENCES b2b_sales_orders(id) ON DELETE RESTRICT,
  FOREIGN KEY (sales_order_item_id) REFERENCES b2b_sales_order_items(id) ON DELETE RESTRICT,
  FOREIGN KEY (product_id) REFERENCES b2b_products(id) ON DELETE RESTRICT,
  FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_var_status (approval_status),
  INDEX idx_var_delivery (delivery_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. Invoices
CREATE TABLE IF NOT EXISTS b2b_invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_number VARCHAR(100) NOT NULL UNIQUE,
  sales_order_id INT NOT NULL,
  delivery_id INT NOT NULL,
  client_id INT NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  payment_terms VARCHAR(50) NOT NULL DEFAULT '30 Days',
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  amount_paid DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  status VARCHAR(50) NOT NULL DEFAULT 'Unpaid',
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (sales_order_id) REFERENCES b2b_sales_orders(id) ON DELETE RESTRICT,
  FOREIGN KEY (delivery_id) REFERENCES b2b_deliveries(id) ON DELETE RESTRICT,
  FOREIGN KEY (client_id) REFERENCES b2b_clients(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_inv_number (invoice_number),
  INDEX idx_inv_client (client_id),
  INDEX idx_inv_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. Invoice Items
CREATE TABLE IF NOT EXISTS b2b_invoice_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL,
  product_id INT NOT NULL,
  ordered_qty INT NOT NULL,
  delivered_qty INT NOT NULL,
  billable_qty INT NOT NULL,
  foc_qty INT NOT NULL DEFAULT 0,
  unit_price DECIMAL(15,2) NOT NULL,
  discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  subtotal DECIMAL(15,2) NOT NULL,
  FOREIGN KEY (invoice_id) REFERENCES b2b_invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES b2b_products(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. Payments
CREATE TABLE IF NOT EXISTS b2b_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payment_number VARCHAR(100) NOT NULL UNIQUE,
  client_id INT NOT NULL,
  invoice_id INT NOT NULL,
  payment_date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL DEFAULT 'Bank Transfer',
  reference_number VARCHAR(100) NULL,
  bank_name VARCHAR(100) NULL,
  remarks TEXT NULL,
  recorded_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES b2b_clients(id) ON DELETE RESTRICT,
  FOREIGN KEY (invoice_id) REFERENCES b2b_invoices(id) ON DELETE RESTRICT,
  FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_pay_number (payment_number),
  INDEX idx_pay_client (client_id),
  INDEX idx_pay_invoice (invoice_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 14. Customer Ledger (Immutable AR Sub-ledger)
CREATE TABLE IF NOT EXISTS b2b_customer_ledger (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  transaction_date DATE NOT NULL,
  transaction_type VARCHAR(50) NOT NULL,
  reference_number VARCHAR(100) NOT NULL,
  reference_id INT NOT NULL,
  debit_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  credit_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  running_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  remarks TEXT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES b2b_clients(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_cledger_client (client_id, transaction_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 15. Inventory Transactions
CREATE TABLE IF NOT EXISTS b2b_inventory_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  batch_id INT NULL,
  transaction_type VARCHAR(50) NOT NULL,
  reference_type VARCHAR(50) NOT NULL,
  reference_id INT NOT NULL,
  quantity INT NOT NULL,
  previous_stock INT NOT NULL,
  new_stock INT NOT NULL,
  remarks TEXT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES b2b_products(id) ON DELETE RESTRICT,
  FOREIGN KEY (batch_id) REFERENCES b2b_product_batches(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_invtx_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 16. Audit Logs (Append-only)
CREATE TABLE IF NOT EXISTS b2b_audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  action VARCHAR(100) NOT NULL,
  module VARCHAR(100) NOT NULL DEFAULT 'B2B_SALES',
  entity_type VARCHAR(100) NOT NULL,
  entity_id INT NOT NULL,
  old_values JSON NULL,
  new_values JSON NULL,
  reason TEXT NULL,
  ip_address VARCHAR(50) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_entity (entity_type, entity_id),
  INDEX idx_audit_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ==============================================================================
-- MANUFACTURING, PRODUCTION OUTPUT, VARIANCE, DISPOSITION & SHORTAGE TABLES
-- ==============================================================================

-- 14. Production Orders
CREATE TABLE IF NOT EXISTS b2b_production_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  production_order_number VARCHAR(100) NOT NULL UNIQUE,
  sales_order_id INT NOT NULL,
  sales_order_item_id INT NULL,
  client_id INT NOT NULL,
  product_id INT NOT NULL,
  batch_id INT NULL,
  batch_number VARCHAR(100) NOT NULL,
  target_quantity INT NOT NULL,
  actual_produced_quantity INT NOT NULL DEFAULT 0,
  unit VARCHAR(50) NOT NULL DEFAULT 'bottle',
  planned_start_date DATE NULL,
  planned_end_date DATE NULL,
  actual_start_date DATE NULL,
  actual_end_date DATE NULL,
  production_status ENUM('PLANNED', 'RELEASED', 'IN_PRODUCTION', 'COMPLETED', 'CANCELLED', 'ON_HOLD') NOT NULL DEFAULT 'PLANNED',
  manufacturing_date DATE NULL,
  expiration_date DATE NULL,
  remarks TEXT NULL,
  created_by INT NULL,
  approved_by INT NULL,
  approved_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (sales_order_id) REFERENCES b2b_sales_orders(id) ON DELETE RESTRICT,
  FOREIGN KEY (client_id) REFERENCES b2b_clients(id) ON DELETE RESTRICT,
  FOREIGN KEY (product_id) REFERENCES b2b_products(id) ON DELETE RESTRICT,
  FOREIGN KEY (batch_id) REFERENCES b2b_product_batches(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_po_number (production_order_number),
  INDEX idx_po_so (sales_order_id),
  INDEX idx_po_product (product_id),
  INDEX idx_po_status (production_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 15. Production Outputs (Multiple outputs per Production Order allowed)
CREATE TABLE IF NOT EXISTS b2b_production_outputs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  production_order_id INT NOT NULL,
  product_id INT NOT NULL,
  batch_id INT NOT NULL,
  batch_number VARCHAR(100) NOT NULL,
  output_quantity INT NOT NULL,
  output_date DATE NOT NULL,
  operator_name VARCHAR(255) NULL,
  supervisor_id INT NULL,
  quality_status ENUM('PASSED', 'QUARANTINE', 'REJECTED') NOT NULL DEFAULT 'PASSED',
  inventory_transaction_id INT NULL,
  remarks TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (production_order_id) REFERENCES b2b_production_orders(id) ON DELETE RESTRICT,
  FOREIGN KEY (product_id) REFERENCES b2b_products(id) ON DELETE RESTRICT,
  FOREIGN KEY (batch_id) REFERENCES b2b_product_batches(id) ON DELETE RESTRICT,
  FOREIGN KEY (supervisor_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (inventory_transaction_id) REFERENCES b2b_inventory_transactions(id) ON DELETE SET NULL,
  INDEX idx_output_po (production_order_id),
  INDEX idx_output_batch (batch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 16. Production Variances (Bi-directional: OVERPRODUCTION & SHORT_PRODUCTION)
CREATE TABLE IF NOT EXISTS b2b_production_variances (
  id INT AUTO_INCREMENT PRIMARY KEY,
  production_variance_number VARCHAR(100) NOT NULL UNIQUE,
  production_order_id INT NOT NULL,
  product_id INT NOT NULL,
  batch_id INT NOT NULL,
  target_quantity INT NOT NULL,
  actual_quantity INT NOT NULL,
  variance_quantity INT NOT NULL,
  variance_type ENUM('OVERPRODUCTION', 'SHORT_PRODUCTION') NOT NULL,
  variance_percentage DECIMAL(5,2) NOT NULL,
  variance_reason ENUM('COMPOUNDING_YIELD', 'PRODUCTION_OVERRUN', 'BATCH_REQUIREMENT', 'FILLING_VARIANCE', 'PACKAGING_VARIANCE', 'PROCESS_LOSS', 'RAW_MATERIAL_DEFECT', 'REPLACEMENT', 'OTHER') NOT NULL,
  status ENUM('PENDING_REVIEW', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING_REVIEW',
  approved_by INT NULL,
  approved_at DATETIME NULL,
  remarks TEXT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (production_order_id) REFERENCES b2b_production_orders(id) ON DELETE RESTRICT,
  FOREIGN KEY (product_id) REFERENCES b2b_products(id) ON DELETE RESTRICT,
  FOREIGN KEY (batch_id) REFERENCES b2b_product_batches(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_pv_po (production_order_id),
  INDEX idx_pv_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 17. Production Dispositions (For Overproduction)
CREATE TABLE IF NOT EXISTS b2b_production_dispositions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  production_variance_id INT NOT NULL,
  production_order_id INT NOT NULL,
  disposition_type ENUM('FOC', 'ADDITIONAL_SALE', 'FINISHED_GOODS_STOCK', 'REWORK', 'SCRAP', 'OTHER') NOT NULL,
  allocated_quantity INT NOT NULL,
  client_confirmation_required TINYINT(1) NOT NULL DEFAULT 0,
  client_confirmation_status ENUM('NOT_REQUIRED', 'PENDING', 'ACCEPTED_AS_FOC', 'ACCEPTED_ADDITIONAL_SALE', 'ACCEPTED_ORDERED_ONLY', 'REJECTED') NOT NULL DEFAULT 'NOT_REQUIRED',
  client_confirmed_by VARCHAR(255) NULL,
  client_confirmed_at DATETIME NULL,
  client_remarks TEXT NULL,
  approved_by INT NULL,
  approved_at DATETIME NULL,
  remarks TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (production_variance_id) REFERENCES b2b_production_variances(id) ON DELETE RESTRICT,
  FOREIGN KEY (production_order_id) REFERENCES b2b_production_orders(id) ON DELETE RESTRICT,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_disp_pv (production_variance_id),
  INDEX idx_disp_po (production_order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 18. Production Shortages (For Short Production)
CREATE TABLE IF NOT EXISTS b2b_production_shortages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  production_variance_id INT NOT NULL,
  production_order_id INT NOT NULL,
  shortage_quantity INT NOT NULL,
  resolution_type ENUM('PARTIAL_DELIVERY_ACCEPTANCE', 'BACKORDER_REMAINDER', 'CANCEL_SHORTAGE', 'SCRAP_SHORTAGE') NOT NULL,
  client_accepted TINYINT(1) NOT NULL DEFAULT 0,
  client_confirmed_by VARCHAR(255) NULL,
  client_confirmed_at DATETIME NULL,
  manager_approved_by INT NULL,
  manager_approved_at DATETIME NULL,
  remarks TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (production_variance_id) REFERENCES b2b_production_variances(id) ON DELETE RESTRICT,
  FOREIGN KEY (production_order_id) REFERENCES b2b_production_orders(id) ON DELETE RESTRICT,
  FOREIGN KEY (manager_approved_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_shortage_pv (production_variance_id),
  INDEX idx_shortage_po (production_order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 19. Delivery Variances (Root Cause Attribution)
CREATE TABLE IF NOT EXISTS b2b_delivery_variances (
  id INT AUTO_INCREMENT PRIMARY KEY,
  delivery_id INT NOT NULL,
  delivery_item_id INT NOT NULL,
  product_id INT NOT NULL,
  batch_id INT NULL,
  ordered_quantity INT NOT NULL,
  delivered_quantity INT NOT NULL,
  variance_quantity INT NOT NULL,
  variance_source ENUM('PRODUCTION_OVERRUN', 'WAREHOUSE_DISPATCH_VARIANCE', 'SAMPLE_ADDITION', 'CLIENT_ADDITIONAL_REQUEST') NOT NULL,
  production_variance_id INT NULL,
  status ENUM('RESOLVED', 'PENDING_APPROVAL') NOT NULL DEFAULT 'RESOLVED',
  remarks TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (delivery_id) REFERENCES b2b_deliveries(id) ON DELETE RESTRICT,
  FOREIGN KEY (delivery_item_id) REFERENCES b2b_delivery_items(id) ON DELETE RESTRICT,
  FOREIGN KEY (product_id) REFERENCES b2b_products(id) ON DELETE RESTRICT,
  FOREIGN KEY (batch_id) REFERENCES b2b_product_batches(id) ON DELETE SET NULL,
  FOREIGN KEY (production_variance_id) REFERENCES b2b_production_variances(id) ON DELETE SET NULL,
  INDEX idx_dv_delivery (delivery_id),
  INDEX idx_dv_pv (production_variance_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
