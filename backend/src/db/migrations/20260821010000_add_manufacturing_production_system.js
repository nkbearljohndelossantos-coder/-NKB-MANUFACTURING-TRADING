/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // 1. Production Orders Table
  if (!(await knex.schema.hasTable('b2b_production_orders'))) {
    await knex.schema.createTable('b2b_production_orders', (table) => {
      table.increments('id').primary();
      table.string('production_order_number', 100).notNullable().unique();
      table.integer('sales_order_id').unsigned().notNullable();
      table.integer('sales_order_item_id').unsigned().nullable();
      table.integer('client_id').unsigned().notNullable();
      table.integer('product_id').unsigned().notNullable();
      table.integer('batch_id').unsigned().nullable();
      table.string('batch_number', 100).notNullable();
      table.integer('target_quantity').notNullable();
      table.integer('actual_produced_quantity').notNullable().defaultTo(0);
      table.string('unit', 50).notNullable().defaultTo('bottle');
      table.date('planned_start_date').nullable();
      table.date('planned_end_date').nullable();
      table.date('actual_start_date').nullable();
      table.date('actual_end_date').nullable();
      table.string('production_status', 50).notNullable().defaultTo('PLANNED'); // PLANNED, RELEASED, IN_PRODUCTION, COMPLETED, CANCELLED, ON_HOLD
      table.date('manufacturing_date').nullable();
      table.date('expiration_date').nullable();
      table.text('remarks').nullable();
      table.integer('created_by').unsigned().nullable();
      table.integer('approved_by').unsigned().nullable();
      table.datetime('approved_at').nullable();
      table.timestamps(true, true);

      table.foreign('sales_order_id').references('b2b_sales_orders.id').onDelete('RESTRICT');
      table.foreign('client_id').references('b2b_clients.id').onDelete('RESTRICT');
      table.foreign('product_id').references('b2b_products.id').onDelete('RESTRICT');
      table.foreign('batch_id').references('b2b_product_batches.id').onDelete('SET NULL');
      table.foreign('created_by').references('users.id').onDelete('SET NULL');
      table.foreign('approved_by').references('users.id').onDelete('SET NULL');

      table.index(['production_order_number'], 'idx_po_number');
      table.index(['sales_order_id'], 'idx_po_so');
      table.index(['product_id'], 'idx_po_product');
      table.index(['production_status'], 'idx_po_status');
    });
  }

  // 2. Production Outputs Table (Multiple outputs per Production Order allowed)
  if (!(await knex.schema.hasTable('b2b_production_outputs'))) {
    await knex.schema.createTable('b2b_production_outputs', (table) => {
      table.increments('id').primary();
      table.integer('production_order_id').unsigned().notNullable();
      table.integer('product_id').unsigned().notNullable();
      table.integer('batch_id').unsigned().notNullable();
      table.string('batch_number', 100).notNullable();
      table.integer('output_quantity').notNullable();
      table.date('output_date').notNullable();
      table.string('operator_name', 255).nullable();
      table.integer('supervisor_id').unsigned().nullable();
      table.string('quality_status', 50).notNullable().defaultTo('PASSED'); // PASSED, QUARANTINE, REJECTED
      table.integer('inventory_transaction_id').unsigned().nullable();
      table.text('remarks').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());

      table.foreign('production_order_id').references('b2b_production_orders.id').onDelete('RESTRICT');
      table.foreign('product_id').references('b2b_products.id').onDelete('RESTRICT');
      table.foreign('batch_id').references('b2b_product_batches.id').onDelete('RESTRICT');
      table.foreign('supervisor_id').references('users.id').onDelete('SET NULL');
      table.foreign('inventory_transaction_id').references('b2b_inventory_transactions.id').onDelete('SET NULL');

      table.index(['production_order_id'], 'idx_output_po');
      table.index(['batch_id'], 'idx_output_batch');
    });
  }

  // 3. Production Variances Table (Bi-directional: OVERPRODUCTION & SHORT_PRODUCTION)
  if (!(await knex.schema.hasTable('b2b_production_variances'))) {
    await knex.schema.createTable('b2b_production_variances', (table) => {
      table.increments('id').primary();
      table.string('production_variance_number', 100).notNullable().unique();
      table.integer('production_order_id').unsigned().notNullable();
      table.integer('product_id').unsigned().notNullable();
      table.integer('batch_id').unsigned().notNullable();
      table.integer('target_quantity').notNullable();
      table.integer('actual_quantity').notNullable();
      table.integer('variance_quantity').notNullable(); // Actual - Target (+100 or -50)
      table.string('variance_type', 50).notNullable(); // OVERPRODUCTION, SHORT_PRODUCTION
      table.decimal('variance_percentage', 5, 2).notNullable();
      table.string('variance_reason', 100).notNullable(); // COMPOUNDING_YIELD, PRODUCTION_OVERRUN, BATCH_REQUIREMENT, FILLING_VARIANCE, PACKAGING_VARIANCE, PROCESS_LOSS, RAW_MATERIAL_DEFECT, REPLACEMENT, OTHER
      table.string('status', 50).notNullable().defaultTo('PENDING_REVIEW'); // PENDING_REVIEW, APPROVED, REJECTED
      table.integer('approved_by').unsigned().nullable();
      table.datetime('approved_at').nullable();
      table.text('remarks').nullable();
      table.integer('created_by').unsigned().nullable();
      table.timestamps(true, true);

      table.foreign('production_order_id').references('b2b_production_orders.id').onDelete('RESTRICT');
      table.foreign('product_id').references('b2b_products.id').onDelete('RESTRICT');
      table.foreign('batch_id').references('b2b_product_batches.id').onDelete('RESTRICT');
      table.foreign('created_by').references('users.id').onDelete('SET NULL');
      table.foreign('approved_by').references('users.id').onDelete('SET NULL');

      table.index(['production_order_id'], 'idx_pv_po');
      table.index(['status'], 'idx_pv_status');
    });
  }

  // 4. Production Dispositions Table (For Overproduction)
  if (!(await knex.schema.hasTable('b2b_production_dispositions'))) {
    await knex.schema.createTable('b2b_production_dispositions', (table) => {
      table.increments('id').primary();
      table.integer('production_variance_id').unsigned().notNullable();
      table.integer('production_order_id').unsigned().notNullable();
      table.string('disposition_type', 50).notNullable(); // FOC, ADDITIONAL_SALE, FINISHED_GOODS_STOCK, REWORK, SCRAP, OTHER
      table.integer('allocated_quantity').notNullable();
      table.boolean('client_confirmation_required').notNullable().defaultTo(false);
      table.string('client_confirmation_status', 50).notNullable().defaultTo('NOT_REQUIRED'); // NOT_REQUIRED, PENDING, ACCEPTED_AS_FOC, ACCEPTED_ADDITIONAL_SALE, ACCEPTED_ORDERED_ONLY, REJECTED
      table.string('client_confirmed_by', 255).nullable();
      table.datetime('client_confirmed_at').nullable();
      table.text('client_remarks').nullable();
      table.integer('approved_by').unsigned().nullable();
      table.datetime('approved_at').nullable();
      table.text('remarks').nullable();
      table.timestamps(true, true);

      table.foreign('production_variance_id').references('b2b_production_variances.id').onDelete('RESTRICT');
      table.foreign('production_order_id').references('b2b_production_orders.id').onDelete('RESTRICT');
      table.foreign('approved_by').references('users.id').onDelete('SET NULL');

      table.index(['production_variance_id'], 'idx_disp_pv');
      table.index(['production_order_id'], 'idx_disp_po');
    });
  }

  // 5. Production Shortages Table (For Short Production)
  if (!(await knex.schema.hasTable('b2b_production_shortages'))) {
    await knex.schema.createTable('b2b_production_shortages', (table) => {
      table.increments('id').primary();
      table.integer('production_variance_id').unsigned().notNullable();
      table.integer('production_order_id').unsigned().notNullable();
      table.integer('shortage_quantity').notNullable();
      table.string('resolution_type', 50).notNullable(); // PARTIAL_DELIVERY_ACCEPTANCE, BACKORDER_REMAINDER, CANCEL_SHORTAGE, SCRAP_SHORTAGE
      table.boolean('client_accepted').notNullable().defaultTo(false);
      table.string('client_confirmed_by', 255).nullable();
      table.datetime('client_confirmed_at').nullable();
      table.integer('manager_approved_by').unsigned().nullable();
      table.datetime('manager_approved_at').nullable();
      table.text('remarks').nullable();
      table.timestamps(true, true);

      table.foreign('production_variance_id').references('b2b_production_variances.id').onDelete('RESTRICT');
      table.foreign('production_order_id').references('b2b_production_orders.id').onDelete('RESTRICT');
      table.foreign('manager_approved_by').references('users.id').onDelete('SET NULL');

      table.index(['production_variance_id'], 'idx_shortage_pv');
      table.index(['production_order_id'], 'idx_shortage_po');
    });
  }

  // 6. Delivery Variances Table (Root cause attribution)
  if (!(await knex.schema.hasTable('b2b_delivery_variances'))) {
    await knex.schema.createTable('b2b_delivery_variances', (table) => {
      table.increments('id').primary();
      table.integer('delivery_id').unsigned().notNullable();
      table.integer('delivery_item_id').unsigned().nullable();
      table.integer('product_id').unsigned().notNullable();
      table.integer('batch_id').unsigned().nullable();
      table.integer('ordered_quantity').notNullable();
      table.integer('delivered_quantity').notNullable();
      table.integer('variance_quantity').notNullable(); // Delivered - Ordered
      table.string('variance_source', 100).notNullable(); // PRODUCTION_OVERRUN, WAREHOUSE_DISPATCH_VARIANCE, SAMPLE_ADDITION, CLIENT_ADDITIONAL_REQUEST
      table.integer('production_variance_id').unsigned().nullable();
      table.string('status', 50).notNullable().defaultTo('RESOLVED'); // RESOLVED, PENDING_APPROVAL
      table.text('remarks').nullable();
      table.timestamps(true, true);

      table.foreign('delivery_id').references('b2b_deliveries.id').onDelete('RESTRICT');
      table.foreign('product_id').references('b2b_products.id').onDelete('RESTRICT');
      table.foreign('batch_id').references('b2b_product_batches.id').onDelete('SET NULL');
      table.foreign('production_variance_id').references('b2b_production_variances.id').onDelete('SET NULL');

      table.index(['delivery_id'], 'idx_dv_delivery');
      table.index(['production_variance_id'], 'idx_dv_pv');
    });
  }

  // 7. Add production_order_id and production_quantity to deliveries / items if missing
  if (await knex.schema.hasTable('b2b_deliveries')) {
    if (!(await knex.schema.hasColumn('b2b_deliveries', 'production_order_id'))) {
      await knex.schema.table('b2b_deliveries', (table) => {
        table.integer('production_order_id').unsigned().nullable();
        table.foreign('production_order_id').references('b2b_production_orders.id').onDelete('SET NULL');
      });
    }
  }

  if (await knex.schema.hasTable('b2b_delivery_items')) {
    if (!(await knex.schema.hasColumn('b2b_delivery_items', 'production_order_id'))) {
      await knex.schema.table('b2b_delivery_items', (table) => {
        table.integer('production_order_id').unsigned().nullable();
      });
    }
    if (!(await knex.schema.hasColumn('b2b_delivery_items', 'production_quantity'))) {
      await knex.schema.table('b2b_delivery_items', (table) => {
        table.integer('production_quantity').notNullable().defaultTo(0);
      });
    }
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  if (await knex.schema.hasTable('b2b_delivery_variances')) {
    await knex.schema.dropTable('b2b_delivery_variances');
  }
  if (await knex.schema.hasTable('b2b_production_shortages')) {
    await knex.schema.dropTable('b2b_production_shortages');
  }
  if (await knex.schema.hasTable('b2b_production_dispositions')) {
    await knex.schema.dropTable('b2b_production_dispositions');
  }
  if (await knex.schema.hasTable('b2b_production_variances')) {
    await knex.schema.dropTable('b2b_production_variances');
  }
  if (await knex.schema.hasTable('b2b_production_outputs')) {
    await knex.schema.dropTable('b2b_production_outputs');
  }
  if (await knex.schema.hasTable('b2b_production_orders')) {
    await knex.schema.dropTable('b2b_production_orders');
  }
};
