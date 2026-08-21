const db = require('../config/db');
const { logAudit } = require('./auditService');
const { postInventoryTransaction } = require('./inventoryService');
const { PRODUCTION_STATUS, PRODUCTION_VARIANCE_TYPE, DISPOSITION_TYPES, ORDER_STATUS } = require('../config/constants');

/**
 * Generate sequential Production Order number: PO-YYYY-XXXXXX
 */
async function generatePONumber(trx) {
  const runner = trx || db;
  const year = new Date().getFullYear();
  const countRes = await runner('b2b_production_orders').count('id as count').first();
  const count = (countRes?.count || 0) + 1;
  return `PO-${year}-${String(count).padStart(6, '0')}`;
}

/**
 * Generate sequential Production Variance number: PV-YYYY-XXXXXX
 */
async function generatePVNumber(trx) {
  const runner = trx || db;
  const year = new Date().getFullYear();
  const countRes = await runner('b2b_production_variances').count('id as count').first();
  const count = (countRes?.count || 0) + 1;
  return `PV-${year}-${String(count).padStart(6, '0')}`;
}

/**
 * Create a new Production Order from Sales Order
 */
async function createProductionOrder({ sales_order_id, sales_order_item_id, target_quantity, planned_start_date, planned_end_date, batch_number, remarks, userId, req }) {
  return await db.transaction(async (trx) => {
    const so = await trx('b2b_sales_orders').where('id', sales_order_id).first();
    if (!so) throw new Error('Sales Order not found');

    let soItem;
    if (sales_order_item_id) {
      soItem = await trx('b2b_sales_order_items').where('id', sales_order_item_id).first();
    } else {
      soItem = await trx('b2b_sales_order_items').where('sales_order_id', sales_order_id).first();
    }
    if (!soItem) throw new Error('Sales Order line item not found');

    const product = await trx('b2b_products').where('id', soItem.product_id).first();
    if (!product) throw new Error('Product not found');

    const poNumber = await generatePONumber(trx);
    const batchNum = batch_number || `LOT-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;

    // Ensure batch exists in authoritative b2b_product_batches
    let batch = await trx('b2b_product_batches').where({ product_id: product.id, batch_number: batchNum }).first();
    if (!batch) {
      const [bId] = await trx('b2b_product_batches').insert({
        product_id: product.id,
        batch_number: batchNum,
        manufacturing_date: planned_start_date || new Date(),
        expiration_date: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000), // +2 years
        quantity_available: 0
      });
      batch = { id: bId, batch_number: batchNum };
    }

    const [poId] = await trx('b2b_production_orders').insert({
      production_order_number: poNumber,
      sales_order_id: so.id,
      sales_order_item_id: soItem.id,
      client_id: so.client_id,
      product_id: product.id,
      batch_id: batch.id,
      batch_number: batchNum,
      target_quantity: target_quantity || soItem.ordered_qty,
      actual_produced_quantity: 0,
      unit: product.unit_of_measure || 'bottle',
      planned_start_date: planned_start_date || new Date(),
      planned_end_date: planned_end_date || null,
      production_status: PRODUCTION_STATUS.PLANNED,
      manufacturing_date: planned_start_date || new Date(),
      expiration_date: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000),
      remarks,
      created_by: userId
    });

    // Update Sales Order status to FOR_PRODUCTION
    await trx('b2b_sales_orders').where('id', so.id).update({
      status: ORDER_STATUS.FOR_PRODUCTION
    });

    await logAudit({
      userId,
      action: 'PRODUCTION_ORDER_CREATED',
      module: 'MANUFACTURING',
      entityType: 'b2b_production_orders',
      entityId: poId,
      newValues: { poNumber, target_quantity: target_quantity || soItem.ordered_qty, batchNum },
      reason: 'Created production order from sales order',
      req
    }, trx);

    return { id: poId, production_order_number: poNumber, batch_id: batch.id, batch_number: batchNum };
  });
}

/**
 * Start Production Order
 */
async function startProductionOrder(poId, userId, req) {
  return await db.transaction(async (trx) => {
    const po = await trx('b2b_production_orders').where('id', poId).first();
    if (!po) throw new Error('Production Order not found');

    await trx('b2b_production_orders').where('id', poId).update({
      production_status: PRODUCTION_STATUS.IN_PRODUCTION,
      actual_start_date: new Date()
    });

    await trx('b2b_sales_orders').where('id', po.sales_order_id).update({
      status: ORDER_STATUS.IN_PRODUCTION
    });

    await logAudit({
      userId,
      action: 'PRODUCTION_STARTED',
      module: 'MANUFACTURING',
      entityType: 'b2b_production_orders',
      entityId: poId,
      newValues: { status: PRODUCTION_STATUS.IN_PRODUCTION },
      reason: 'Started production compounding & filling',
      req
    }, trx);

    return { success: true, status: PRODUCTION_STATUS.IN_PRODUCTION };
  });
}

/**
 * Record Production Output (Posts Finished Goods inventory exactly ONCE per output event)
 */
async function recordProductionOutput({ poId, output_quantity, output_date, operator_name, supervisor_id, quality_status, remarks, userId, req }) {
  if (!output_quantity || output_quantity <= 0) {
    throw new Error('Output quantity must be greater than zero');
  }

  return await db.transaction(async (trx) => {
    const po = await trx('b2b_production_orders').where('id', poId).forUpdate().first();
    if (!po) throw new Error('Production Order not found');

    const product = await trx('b2b_products').where('id', po.product_id).forUpdate().first();
    const batch = await trx('b2b_product_batches').where('id', po.batch_id).forUpdate().first();

    // 1. Post inventory transaction (Adds finished goods inventory exactly ONCE)
    const invTxn = await postInventoryTransaction({
      productId: po.product_id,
      batchId: po.batch_id,
      transactionType: 'PRODUCTION_RECEIPT',
      quantity: output_quantity,
      referenceType: 'PRODUCTION_ORDER',
      referenceId: po.id,
      notes: `Production output logged for ${po.production_order_number} (Batch: ${po.batch_number})`,
      userId
    }, trx);

    // 2. Insert b2b_production_outputs
    const [outputId] = await trx('b2b_production_outputs').insert({
      production_order_id: po.id,
      product_id: po.product_id,
      batch_id: po.batch_id,
      batch_number: po.batch_number,
      output_quantity,
      output_date: output_date || new Date(),
      operator_name,
      supervisor_id: supervisor_id || userId,
      quality_status: quality_status || 'PASSED',
      inventory_transaction_id: invTxn.id,
      remarks
    });

    // 3. System-maintained synchronization: actual_produced_quantity = SUM(outputs)
    const sumRes = await trx('b2b_production_outputs')
      .where('production_order_id', po.id)
      .sum('output_quantity as totalOutput')
      .first();
    const totalActualOutput = Number(sumRes?.totalOutput || output_quantity);

    const varianceQty = totalActualOutput - po.target_quantity;
    const variancePercent = Number(((varianceQty / po.target_quantity) * 100).toFixed(2));

    await trx('b2b_production_orders').where('id', po.id).update({
      actual_produced_quantity: totalActualOutput,
      actual_end_date: new Date(),
      production_status: PRODUCTION_STATUS.COMPLETED
    });

    // 4. If variance exists (+100 overrun or -50 shortage), create or update b2b_production_variances
    let pvRecord = null;
    if (varianceQty !== 0) {
      const pvType = varianceQty > 0 ? PRODUCTION_VARIANCE_TYPE.OVERPRODUCTION : PRODUCTION_VARIANCE_TYPE.SHORT_PRODUCTION;
      const pvNumber = await generatePVNumber(trx);

      const [pvId] = await trx('b2b_production_variances').insert({
        production_variance_number: pvNumber,
        production_order_id: po.id,
        product_id: po.product_id,
        batch_id: po.batch_id,
        target_quantity: po.target_quantity,
        actual_quantity: totalActualOutput,
        variance_quantity: varianceQty,
        variance_type: pvType,
        variance_percentage: variancePercent,
        variance_reason: varianceQty > 0 ? 'PRODUCTION_OVERRUN' : 'PROCESS_LOSS',
        status: 'PENDING_REVIEW',
        remarks: `Auto-detected ${pvType}: ${varianceQty > 0 ? '+' : ''}${varianceQty} units (${variancePercent}%)`,
        created_by: userId
      });
      pvRecord = { id: pvId, production_variance_number: pvNumber, variance_quantity: varianceQty, variance_type: pvType };
    }

    // Update Sales Order status to READY_FOR_DELIVERY
    await trx('b2b_sales_orders').where('id', po.sales_order_id).update({
      status: ORDER_STATUS.READY_FOR_DELIVERY
    });

    await logAudit({
      userId,
      action: 'PRODUCTION_OUTPUT_RECORDED',
      module: 'MANUFACTURING',
      entityType: 'b2b_production_outputs',
      entityId: outputId,
      newValues: { output_quantity, totalActualOutput, varianceQty, variancePercent },
      reason: 'Logged production compounding output and posted inventory receipt',
      req
    }, trx);

    return {
      outputId,
      totalActualOutput,
      target_quantity: po.target_quantity,
      varianceQty,
      variancePercent,
      variance: pvRecord
    };
  });
}

/**
 * Assign Excess Disposition (For Overproduction)
 * Invariant: SUM(allocated_quantity) <= variance_quantity
 */
async function assignExcessDisposition({ pvId, dispositions, userId, req }) {
  return await db.transaction(async (trx) => {
    const pv = await trx('b2b_production_variances').where('id', pvId).forUpdate().first();
    if (!pv) throw new Error('Production Variance record not found');
    if (pv.variance_type !== PRODUCTION_VARIANCE_TYPE.OVERPRODUCTION) {
      throw new Error('Excess disposition can only be applied to overproduction variances');
    }

    const excessQty = pv.variance_quantity;
    const totalAllocated = dispositions.reduce((sum, d) => sum + Number(d.allocated_quantity || 0), 0);

    if (totalAllocated > excessQty) {
      throw new Error(`Total disposition allocation (${totalAllocated}) cannot exceed production excess quantity (${excessQty})`);
    }

    const po = await trx('b2b_production_orders').where('id', pv.production_order_id).first();
    const soItem = await trx('b2b_sales_order_items').where('id', po.sales_order_item_id).first();

    let focQty = 0;
    let additionalSaleQty = 0;
    let stockQty = 0;

    for (const d of dispositions) {
      await trx('b2b_production_dispositions').insert({
        production_variance_id: pv.id,
        production_order_id: po.id,
        disposition_type: d.disposition_type,
        allocated_quantity: d.allocated_quantity,
        client_confirmation_required: d.disposition_type === DISPOSITION_TYPES.ADDITIONAL_SALE || d.client_confirmation_required ? 1 : 0,
        client_confirmation_status: d.disposition_type === DISPOSITION_TYPES.ADDITIONAL_SALE ? 'PENDING' : 'ACCEPTED_AS_FOC',
        approved_by: userId,
        approved_at: new Date(),
        remarks: d.remarks
      });

      if (d.disposition_type === DISPOSITION_TYPES.FOC) {
        focQty += Number(d.allocated_quantity);
      } else if (d.disposition_type === DISPOSITION_TYPES.ADDITIONAL_SALE) {
        additionalSaleQty += Number(d.allocated_quantity);
      } else if (d.disposition_type === DISPOSITION_TYPES.FINISHED_GOODS_STOCK) {
        stockQty += Number(d.allocated_quantity);
      }
    }

    // Update sales order line item quantities
    const newBillableQty = soItem.ordered_qty + additionalSaleQty;
    await trx('b2b_sales_order_items').where('id', soItem.id).update({
      billable_qty: newBillableQty,
      foc_qty: focQty,
      variance_qty: excessQty
    });

    // Update variance status to APPROVED
    await trx('b2b_production_variances').where('id', pv.id).update({
      status: 'APPROVED',
      approved_by: userId,
      approved_at: new Date()
    });

    await logAudit({
      userId,
      action: 'DISPOSITION_APPROVED',
      module: 'MANUFACTURING',
      entityType: 'b2b_production_variances',
      entityId: pv.id,
      newValues: { focQty, additionalSaleQty, stockQty, newBillableQty },
      reason: 'Approved excess production disposition and updated sales order billable/FOC quantities',
      req
    }, trx);

    return {
      success: true,
      varianceId: pv.id,
      billable_qty: newBillableQty,
      foc_qty: focQty,
      stock_qty: stockQty
    };
  });
}

/**
 * Resolve Short Production (For Short Production)
 */
async function resolveShortage({ pvId, resolution_type, client_accepted, remarks, userId, req }) {
  return await db.transaction(async (trx) => {
    const pv = await trx('b2b_production_variances').where('id', pvId).forUpdate().first();
    if (!pv) throw new Error('Production Variance record not found');
    if (pv.variance_type !== PRODUCTION_VARIANCE_TYPE.SHORT_PRODUCTION) {
      throw new Error('Shortage resolution can only be applied to short production variances');
    }

    const shortageQty = Math.abs(pv.variance_quantity);
    const po = await trx('b2b_production_orders').where('id', pv.production_order_id).first();
    const soItem = await trx('b2b_sales_order_items').where('id', po.sales_order_item_id).first();

    await trx('b2b_production_shortages').insert({
      production_variance_id: pv.id,
      production_order_id: po.id,
      shortage_quantity: shortageQty,
      resolution_type,
      client_accepted: client_accepted ? 1 : 0,
      manager_approved_by: userId,
      manager_approved_at: new Date(),
      remarks
    });

    // If client accepts partial delivery, update billable quantity to actual output
    if (resolution_type === 'PARTIAL_DELIVERY_ACCEPTANCE' || client_accepted) {
      await trx('b2b_sales_order_items').where('id', soItem.id).update({
        billable_qty: po.actual_produced_quantity,
        foc_qty: 0,
        variance_qty: pv.variance_quantity
      });
    }

    await trx('b2b_production_variances').where('id', pv.id).update({
      status: 'APPROVED',
      approved_by: userId,
      approved_at: new Date()
    });

    await logAudit({
      userId,
      action: 'SHORTAGE_RESOLVED',
      module: 'MANUFACTURING',
      entityType: 'b2b_production_variances',
      entityId: pv.id,
      newValues: { shortageQty, resolution_type, client_accepted },
      reason: 'Resolved short production variance',
      req
    }, trx);

    return { success: true, shortageQty, resolution_type };
  });
}

module.exports = {
  createProductionOrder,
  startProductionOrder,
  recordProductionOutput,
  assignExcessDisposition,
  resolveShortage
};
