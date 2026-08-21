/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // 1. Users Table (Enterprise Compatible)
  if (!(await knex.schema.hasTable('users'))) {
    await knex.schema.createTable('users', (table) => {
      table.increments('id').primary();
      table.string('username', 100).notNullable().unique();
      table.string('password', 255).notNullable();
      table.string('full_name', 255).notNullable();
      table.string('email', 255).unique();
      table.string('role', 50).notNullable().defaultTo('SALES');
      table.integer('client_id').unsigned().nullable();
      table.boolean('status').notNullable().defaultTo(true);
      table.timestamps(true, true);
    });
  } else {
    // Add client_id if missing
    if (!(await knex.schema.hasColumn('users', 'client_id'))) {
      await knex.schema.table('users', (table) => {
        table.integer('client_id').unsigned().nullable();
      });
    }
  }

  // 2. B2B Clients Table
  if (!(await knex.schema.hasTable('b2b_clients'))) {
    await knex.schema.createTable('b2b_clients', (table) => {
      table.increments('id').primary();
      table.string('client_code', 50).notNullable().unique();
      table.string('company_name', 255).notNullable();
      table.string('tin_number', 50).nullable();
      table.string('contact_person', 255).notNullable();
      table.string('email', 255).notNullable();
      table.string('phone', 50).notNullable();
      table.text('billing_address').notNullable();
      table.text('delivery_address').notNullable();
      table.decimal('credit_limit', 15, 2).notNullable().defaultTo(0.00);
      table.string('payment_terms', 50).notNullable().defaultTo('30 Days');
      table.string('credit_status', 50).notNullable().defaultTo('Good');
      table.string('credit_control_action', 50).notNullable().defaultTo('Require Approval');
      table.decimal('current_balance', 15, 2).notNullable().defaultTo(0.00);
      table.boolean('is_active').notNullable().defaultTo(true);
      table.timestamps(true, true);
    });
  }

  // 3. Categories
  if (!(await knex.schema.hasTable('b2b_categories'))) {
    await knex.schema.createTable('b2b_categories', (table) => {
      table.increments('id').primary();
      table.string('name', 100).notNullable().unique();
      table.text('description').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // 4. Products
  if (!(await knex.schema.hasTable('b2b_products'))) {
    await knex.schema.createTable('b2b_products', (table) => {
      table.increments('id').primary();
      table.string('sku', 100).notNullable().unique();
      table.string('product_name', 255).notNullable();
      table.text('description').nullable();
      table.integer('category_id').unsigned().references('id').inTable('b2b_categories').onDelete('SET NULL');
      table.string('category_name', 100).defaultTo('Cosmetics');
      table.string('unit_of_measure', 50).notNullable().defaultTo('piece');
      table.decimal('unit_price', 15, 2).notNullable().defaultTo(0.00);
      table.decimal('cost_price', 15, 2).notNullable().defaultTo(0.00);
      table.integer('current_stock').notNullable().defaultTo(0);
      table.integer('minimum_stock').notNullable().defaultTo(10);
      table.boolean('is_active').notNullable().defaultTo(true);
      table.timestamps(true, true);
    });
  }

  // 5. Product Batches / Lots
  if (!(await knex.schema.hasTable('b2b_product_batches'))) {
    await knex.schema.createTable('b2b_product_batches', (table) => {
      table.increments('id').primary();
      table.integer('product_id').unsigned().notNullable().references('id').inTable('b2b_products').onDelete('CASCADE');
      table.string('batch_number', 100).notNullable();
      table.date('manufacturing_date').nullable();
      table.date('expiration_date').nullable();
      table.integer('quantity_available').notNullable().defaultTo(0);
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // 6. Sales Orders
  if (!(await knex.schema.hasTable('b2b_sales_orders'))) {
    await knex.schema.createTable('b2b_sales_orders', (table) => {
      table.increments('id').primary();
      table.string('so_number', 100).notNullable().unique();
      table.integer('client_id').unsigned().notNullable().references('id').inTable('b2b_clients').onDelete('RESTRICT');
      table.string('po_number', 100).nullable();
      table.date('order_date').notNullable();
      table.date('requested_delivery_date').nullable();
      table.string('payment_terms', 50).notNullable().defaultTo('30 Days');
      table.text('delivery_address').notNullable();
      table.integer('salesperson_id').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
      table.decimal('subtotal', 15, 2).notNullable().defaultTo(0.00);
      table.decimal('discount_amount', 15, 2).notNullable().defaultTo(0.00);
      table.decimal('tax_amount', 15, 2).notNullable().defaultTo(0.00);
      table.decimal('total_amount', 15, 2).notNullable().defaultTo(0.00);
      table.string('status', 50).notNullable().defaultTo('Draft');
      table.boolean('credit_check_passed').notNullable().defaultTo(true);
      table.integer('credit_override_by').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
      table.text('remarks').nullable();
      table.timestamps(true, true);
    });
  }

  // 7. Sales Order Items
  if (!(await knex.schema.hasTable('b2b_sales_order_items'))) {
    await knex.schema.createTable('b2b_sales_order_items', (table) => {
      table.increments('id').primary();
      table.integer('sales_order_id').unsigned().notNullable().references('id').inTable('b2b_sales_orders').onDelete('CASCADE');
      table.integer('product_id').unsigned().notNullable().references('id').inTable('b2b_products').onDelete('RESTRICT');
      table.integer('ordered_qty').notNullable();
      table.integer('delivered_qty').notNullable().defaultTo(0);
      table.integer('variance_qty').notNullable().defaultTo(0);
      table.integer('billable_qty').notNullable().defaultTo(0);
      table.integer('foc_qty').notNullable().defaultTo(0);
      table.integer('invoiced_qty').notNullable().defaultTo(0);
      table.decimal('unit_price', 15, 2).notNullable().defaultTo(0.00);
      table.decimal('discount_percent', 5, 2).notNullable().defaultTo(0.00);
      table.decimal('subtotal', 15, 2).notNullable().defaultTo(0.00);
      table.timestamps(true, true);
    });
  }

  // 8. Deliveries
  if (!(await knex.schema.hasTable('b2b_deliveries'))) {
    await knex.schema.createTable('b2b_deliveries', (table) => {
      table.increments('id').primary();
      table.string('delivery_number', 100).notNullable().unique();
      table.integer('sales_order_id').unsigned().notNullable().references('id').inTable('b2b_sales_orders').onDelete('RESTRICT');
      table.integer('client_id').unsigned().notNullable().references('id').inTable('b2b_clients').onDelete('RESTRICT');
      table.date('delivery_date').notNullable();
      table.string('driver_name', 100).nullable();
      table.string('vehicle_plate', 50).nullable();
      table.text('delivery_address').notNullable();
      table.string('status', 50).notNullable().defaultTo('Preparing');
      table.string('received_by', 255).nullable();
      table.datetime('received_date').nullable();
      table.text('remarks').nullable();
      table.integer('created_by').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
      table.timestamps(true, true);
    });
  }

  // 9. Delivery Items
  if (!(await knex.schema.hasTable('b2b_delivery_items'))) {
    await knex.schema.createTable('b2b_delivery_items', (table) => {
      table.increments('id').primary();
      table.integer('delivery_id').unsigned().notNullable().references('id').inTable('b2b_deliveries').onDelete('CASCADE');
      table.integer('sales_order_item_id').unsigned().notNullable().references('id').inTable('b2b_sales_order_items').onDelete('RESTRICT');
      table.integer('product_id').unsigned().notNullable().references('id').inTable('b2b_products').onDelete('RESTRICT');
      table.integer('batch_id').unsigned().nullable().references('id').inTable('b2b_product_batches').onDelete('SET NULL');
      table.integer('ordered_qty').notNullable();
      table.integer('delivered_qty').notNullable();
      table.integer('variance_qty').notNullable().defaultTo(0);
      table.text('remarks').nullable();
    });
  }

  // 10. Quantity Variances
  if (!(await knex.schema.hasTable('b2b_quantity_variances'))) {
    await knex.schema.createTable('b2b_quantity_variances', (table) => {
      table.increments('id').primary();
      table.integer('delivery_id').unsigned().notNullable().references('id').inTable('b2b_deliveries').onDelete('RESTRICT');
      table.integer('sales_order_id').unsigned().notNullable().references('id').inTable('b2b_sales_orders').onDelete('RESTRICT');
      table.integer('sales_order_item_id').unsigned().notNullable().references('id').inTable('b2b_sales_order_items').onDelete('RESTRICT');
      table.integer('product_id').unsigned().notNullable().references('id').inTable('b2b_products').onDelete('RESTRICT');
      table.integer('ordered_qty').notNullable();
      table.integer('delivered_qty').notNullable();
      table.integer('variance_qty').notNullable();
      table.string('variance_type', 50).notNullable();
      table.string('reason', 100).notNullable();
      table.string('proposed_treatment', 100).notNullable();
      table.integer('billable_qty').notNullable();
      table.integer('foc_qty').notNullable();
      table.string('approval_status', 50).notNullable().defaultTo('Pending Approval');
      table.integer('manager_id').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
      table.datetime('approval_date').nullable();
      table.text('approval_remarks').nullable();
      table.boolean('client_confirmation_required').notNullable().defaultTo(false);
      table.string('client_confirmation_status', 50).notNullable().defaultTo('Pending');
      table.string('client_confirmed_by', 255).nullable();
      table.datetime('client_confirmation_date').nullable();
      table.text('client_remarks').nullable();
      table.timestamps(true, true);
    });
  }

  // 11. Invoices
  if (!(await knex.schema.hasTable('b2b_invoices'))) {
    await knex.schema.createTable('b2b_invoices', (table) => {
      table.increments('id').primary();
      table.string('invoice_number', 100).notNullable().unique();
      table.integer('sales_order_id').unsigned().notNullable().references('id').inTable('b2b_sales_orders').onDelete('RESTRICT');
      table.integer('delivery_id').unsigned().notNullable().references('id').inTable('b2b_deliveries').onDelete('RESTRICT');
      table.integer('client_id').unsigned().notNullable().references('id').inTable('b2b_clients').onDelete('RESTRICT');
      table.date('invoice_date').notNullable();
      table.date('due_date').notNullable();
      table.string('payment_terms', 50).notNullable().defaultTo('30 Days');
      table.decimal('subtotal', 15, 2).notNullable().defaultTo(0.00);
      table.decimal('discount_amount', 15, 2).notNullable().defaultTo(0.00);
      table.decimal('tax_amount', 15, 2).notNullable().defaultTo(0.00);
      table.decimal('total_amount', 15, 2).notNullable().defaultTo(0.00);
      table.decimal('amount_paid', 15, 2).notNullable().defaultTo(0.00);
      table.decimal('balance', 15, 2).notNullable().defaultTo(0.00);
      table.string('status', 50).notNullable().defaultTo('Unpaid');
      table.integer('created_by').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
      table.timestamps(true, true);
    });
  }

  // 12. Invoice Items
  if (!(await knex.schema.hasTable('b2b_invoice_items'))) {
    await knex.schema.createTable('b2b_invoice_items', (table) => {
      table.increments('id').primary();
      table.integer('invoice_id').unsigned().notNullable().references('id').inTable('b2b_invoices').onDelete('CASCADE');
      table.integer('product_id').unsigned().notNullable().references('id').inTable('b2b_products').onDelete('RESTRICT');
      table.integer('ordered_qty').notNullable();
      table.integer('delivered_qty').notNullable();
      table.integer('billable_qty').notNullable();
      table.integer('foc_qty').notNullable().defaultTo(0);
      table.decimal('unit_price', 15, 2).notNullable();
      table.decimal('discount_amount', 15, 2).notNullable().defaultTo(0.00);
      table.decimal('tax_amount', 15, 2).notNullable().defaultTo(0.00);
      table.decimal('subtotal', 15, 2).notNullable();
    });
  }

  // 13. Payments
  if (!(await knex.schema.hasTable('b2b_payments'))) {
    await knex.schema.createTable('b2b_payments', (table) => {
      table.increments('id').primary();
      table.string('payment_number', 100).notNullable().unique();
      table.integer('client_id').unsigned().notNullable().references('id').inTable('b2b_clients').onDelete('RESTRICT');
      table.integer('invoice_id').unsigned().notNullable().references('id').inTable('b2b_invoices').onDelete('RESTRICT');
      table.date('payment_date').notNullable();
      table.decimal('amount', 15, 2).notNullable();
      table.string('payment_method', 50).notNullable().defaultTo('Bank Transfer');
      table.string('reference_number', 100).nullable();
      table.string('bank_name', 100).nullable();
      table.text('remarks').nullable();
      table.integer('recorded_by').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
      table.timestamps(true, true);
    });
  }

  // 14. Customer Ledger (Immutable Sub-ledger)
  if (!(await knex.schema.hasTable('b2b_customer_ledger'))) {
    await knex.schema.createTable('b2b_customer_ledger', (table) => {
      table.increments('id').primary();
      table.integer('client_id').unsigned().notNullable().references('id').inTable('b2b_clients').onDelete('RESTRICT');
      table.date('transaction_date').notNullable();
      table.string('transaction_type', 50).notNullable();
      table.string('reference_number', 100).notNullable();
      table.integer('reference_id').notNullable();
      table.decimal('debit_amount', 15, 2).notNullable().defaultTo(0.00);
      table.decimal('credit_amount', 15, 2).notNullable().defaultTo(0.00);
      table.decimal('running_balance', 15, 2).notNullable().defaultTo(0.00);
      table.text('remarks').nullable();
      table.integer('created_by').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // 15. Inventory Transactions
  if (!(await knex.schema.hasTable('b2b_inventory_transactions'))) {
    await knex.schema.createTable('b2b_inventory_transactions', (table) => {
      table.increments('id').primary();
      table.integer('product_id').unsigned().notNullable().references('id').inTable('b2b_products').onDelete('RESTRICT');
      table.integer('batch_id').unsigned().nullable().references('id').inTable('b2b_product_batches').onDelete('SET NULL');
      table.string('transaction_type', 50).notNullable();
      table.string('reference_type', 50).notNullable();
      table.integer('reference_id').notNullable();
      table.integer('quantity').notNullable();
      table.integer('previous_stock').notNullable();
      table.integer('new_stock').notNullable();
      table.text('remarks').nullable();
      table.integer('created_by').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // 16. Audit Logs (Append-Only)
  if (!(await knex.schema.hasTable('b2b_audit_logs'))) {
    await knex.schema.createTable('b2b_audit_logs', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
      table.string('action', 100).notNullable();
      table.string('module', 100).notNullable().defaultTo('B2B_SALES');
      table.string('entity_type', 100).notNullable();
      table.integer('entity_id').notNullable();
      table.text('old_values').nullable();
      table.text('new_values').nullable();
      table.text('reason').nullable();
      table.string('ip_address', 50).nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Non-destructive rollback: only drop B2B tables if explicitly rolled back
  await knex.schema.dropTableIfExists('b2b_audit_logs');
  await knex.schema.dropTableIfExists('b2b_inventory_transactions');
  await knex.schema.dropTableIfExists('b2b_customer_ledger');
  await knex.schema.dropTableIfExists('b2b_payments');
  await knex.schema.dropTableIfExists('b2b_invoice_items');
  await knex.schema.dropTableIfExists('b2b_invoices');
  await knex.schema.dropTableIfExists('b2b_quantity_variances');
  await knex.schema.dropTableIfExists('b2b_delivery_items');
  await knex.schema.dropTableIfExists('b2b_deliveries');
  await knex.schema.dropTableIfExists('b2b_sales_order_items');
  await knex.schema.dropTableIfExists('b2b_sales_orders');
  await knex.schema.dropTableIfExists('b2b_product_batches');
  await knex.schema.dropTableIfExists('b2b_products');
  await knex.schema.dropTableIfExists('b2b_categories');
  await knex.schema.dropTableIfExists('b2b_clients');
};
