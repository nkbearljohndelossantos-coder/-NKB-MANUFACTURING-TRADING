process.env.NODE_ENV = 'test';
const assert = require('assert');
const path = require('path');
const db = require('../src/config/db');
const productionService = require('../src/services/productionService');

async function runScenarioTests() {
  console.log('======================================================================');
  console.log('🧪 RUNNING COMPREHENSIVE B2B MANUFACTURING & VARIANCE TEST SUITE');
  console.log('======================================================================\n');

  try {
    // 1. Run migrations & seeds
    console.log('[1/5] Initializing database, running migrations and loading seeds...');
    await db.migrate.latest();
    await db.seed.run();
    console.log('  ✓ Migrations & Seeds loaded.\n');

    const runId = Date.now();
    const client = await db('b2b_clients').where('client_code', 'CLI-001').first();
    const product = await db('b2b_products').where('sku', 'LOT-001').first();

    // ====================================================================
    // SCENARIO 1: OVERRUN + 100 FOC (1,000 ordered, 1,100 produced, 100 FOC, ₱100k)
    // ====================================================================
    console.log('[2/5] SCENARIO 1: Overrun + 100 FOC');
    const [so1Id] = await db('b2b_sales_orders').insert({
      so_number: `SO-TEST-SCENARIO-1-${runId}`,
      client_id: client.id,
      po_number: `PO-SCENARIO-1-${runId}`,
      order_date: new Date(),
      payment_terms: '30 Days',
      delivery_address: 'Warehouse A',
      subtotal: 100000,
      total_amount: 100000,
      status: 'Confirmed'
    });

    const [soItem1Id] = await db('b2b_sales_order_items').insert({
      sales_order_id: so1Id,
      product_id: product.id,
      ordered_qty: 1000,
      delivered_qty: 0,
      variance_qty: 0,
      billable_qty: 1000,
      foc_qty: 0,
      unit_price: 100.00,
      subtotal: 100000
    });

    // Create & Start Production Order
    const po1 = await productionService.createProductionOrder({
      sales_order_id: so1Id,
      sales_order_item_id: soItem1Id,
      target_quantity: 1000,
      batch_number: 'BATCH-SCENARIO-1',
      userId: 1
    });
    await productionService.startProductionOrder(po1.id, 1);

    // Initial stock before output
    const stockBefore1 = (await db('b2b_products').where('id', product.id).first()).current_stock;

    // Log Output: 1,100 bottles (+100 overrun)
    const out1 = await productionService.recordProductionOutput({
      poId: po1.id,
      output_quantity: 1100,
      output_date: new Date(),
      userId: 1
    });

    const stockAfterOutput1 = (await db('b2b_products').where('id', product.id).first()).current_stock;
    assert.strictEqual(stockAfterOutput1 - stockBefore1, 1100, 'Physical inventory must increase by exactly +1,100');
    assert.strictEqual(out1.varianceQty, 100, 'Variance must be +100 units');

    // Assign Excess Disposition: 100 FOC
    await productionService.assignExcessDisposition({
      pvId: out1.variance.id,
      dispositions: [{ disposition_type: 'FOC', allocated_quantity: 100, remarks: '100 bonus FOC' }],
      userId: 1
    });

    const soItem1Updated = await db('b2b_sales_order_items').where('id', soItem1Id).first();
    assert.strictEqual(soItem1Updated.billable_qty, 1000, 'Billable quantity must remain 1,000');
    assert.strictEqual(soItem1Updated.foc_qty, 100, 'FOC quantity must be 100');

    // Deliver all 1,100
    const [del1Id] = await db('b2b_deliveries').insert({
      delivery_number: 'DR-TEST-SCENARIO-1',
      sales_order_id: so1Id,
      client_id: client.id,
      delivery_date: new Date(),
      delivery_address: 'Warehouse A',
      status: 'Delivered'
    });
    await db('b2b_delivery_items').insert({
      delivery_id: del1Id,
      sales_order_item_id: soItem1Id,
      product_id: product.id,
      batch_id: po1.batch_id,
      ordered_qty: 1000,
      delivered_qty: 1100
    });
    // Deduct physical stock (-1,100)
    await db('b2b_products').where('id', product.id).decrement('current_stock', 1100);
    await db('b2b_product_batches').where('id', po1.batch_id).decrement('quantity_available', 1100);

    const batchStock1 = (await db('b2b_product_batches').where('id', po1.batch_id).first()).quantity_available;
    assert.strictEqual(batchStock1, 0, 'Net batch stock remaining must be 0');

    // Invoice generation strictly on Billable Qty (1,000 * ₱100 = ₱100,000)
    const invoiceTotal1 = soItem1Updated.billable_qty * soItem1Updated.unit_price;
    assert.strictEqual(invoiceTotal1, 100000, 'Invoice must be exactly ₱100,000');
    console.log('  ✓ SCENARIO 1 PASSED: 1,000 Ordered, 1,100 Produced, 100 FOC, 1,100 Delivered, ₱100,000 Invoiced, 0 Net Stock.\n');

    // ====================================================================
    // SCENARIO 2: OVERRUN + ADDITIONAL SALE (1,000 ordered, 1,100 produced, 1,100 billable, ₱110k)
    // ====================================================================
    console.log('[3/5] SCENARIO 2: Overrun + Additional Sale Approved (₱110,000 Invoice)');
    const [so2Id] = await db('b2b_sales_orders').insert({
      so_number: `SO-TEST-SCENARIO-2-${runId}`,
      client_id: client.id,
      po_number: `PO-SCENARIO-2-${runId}`,
      order_date: new Date(),
      payment_terms: '30 Days',
      delivery_address: 'Warehouse A',
      subtotal: 100000,
      total_amount: 100000,
      status: 'Confirmed'
    });

    const [soItem2Id] = await db('b2b_sales_order_items').insert({
      sales_order_id: so2Id,
      product_id: product.id,
      ordered_qty: 1000,
      delivered_qty: 0,
      variance_qty: 0,
      billable_qty: 1000,
      foc_qty: 0,
      unit_price: 100.00,
      subtotal: 100000
    });

    const po2 = await productionService.createProductionOrder({
      sales_order_id: so2Id,
      sales_order_item_id: soItem2Id,
      target_quantity: 1000,
      batch_number: `BATCH-SCENARIO-2-${runId}`,
      userId: 1
    });
    await productionService.startProductionOrder(po2.id, 1);

    const out2 = await productionService.recordProductionOutput({
      poId: po2.id,
      output_quantity: 1100,
      output_date: new Date(),
      userId: 1
    });

    // Client accepts additional sale of 100 units
    await productionService.assignExcessDisposition({
      pvId: out2.variance.id,
      dispositions: [{ disposition_type: 'ADDITIONAL_SALE', allocated_quantity: 100, remarks: 'Client accepted extra 100 units' }],
      userId: 1
    });

    const soItem2Updated = await db('b2b_sales_order_items').where('id', soItem2Id).first();
    assert.strictEqual(soItem2Updated.billable_qty, 1100, 'Billable quantity must be 1,100');
    assert.strictEqual(soItem2Updated.foc_qty, 0, 'FOC quantity must be 0');

    const invoiceTotal2 = soItem2Updated.billable_qty * soItem2Updated.unit_price;
    assert.strictEqual(invoiceTotal2, 110000, 'Invoice total must be ₱110,000');
    console.log('  ✓ SCENARIO 2 PASSED: 1,000 Ordered, 1,100 Produced, 1,100 Billable, ₱110,000 Invoiced.\n');

    // ====================================================================
    // SCENARIO 3: OVERRUN + FINISHED GOODS STOCK (1,000 ordered, 1,100 produced, 1,000 delivered, +100 stock remaining)
    // ====================================================================
    console.log('[4/5] SCENARIO 3: Overrun + Finished Goods Stock (+100 Remaining)');
    const [so3Id] = await db('b2b_sales_orders').insert({
      so_number: `SO-TEST-SCENARIO-3-${runId}`,
      client_id: client.id,
      po_number: `PO-SCENARIO-3-${runId}`,
      order_date: new Date(),
      payment_terms: '30 Days',
      delivery_address: 'Warehouse A',
      subtotal: 100000,
      total_amount: 100000,
      status: 'Confirmed'
    });

    const [soItem3Id] = await db('b2b_sales_order_items').insert({
      sales_order_id: so3Id,
      product_id: product.id,
      ordered_qty: 1000,
      delivered_qty: 0,
      variance_qty: 0,
      billable_qty: 1000,
      foc_qty: 0,
      unit_price: 100.00,
      subtotal: 100000
    });

    const po3 = await productionService.createProductionOrder({
      sales_order_id: so3Id,
      sales_order_item_id: soItem3Id,
      target_quantity: 1000,
      batch_number: `BATCH-SCENARIO-3-${runId}`,
      userId: 1
    });
    await productionService.startProductionOrder(po3.id, 1);

    const out3 = await productionService.recordProductionOutput({
      poId: po3.id,
      output_quantity: 1100,
      output_date: new Date(),
      userId: 1
    });

    // Disposition: Retain 100 in Finished Goods Stock
    await productionService.assignExcessDisposition({
      pvId: out3.variance.id,
      dispositions: [{ disposition_type: 'FINISHED_GOODS_STOCK', allocated_quantity: 100, remarks: 'Retain 100 in warehouse stock' }],
      userId: 1
    });

    // Deliver only requested 1,000
    await db('b2b_products').where('id', product.id).decrement('current_stock', 1000);
    await db('b2b_product_batches').where('id', po3.batch_id).decrement('quantity_available', 1000);

    const batchStock3 = (await db('b2b_product_batches').where('id', po3.batch_id).first()).quantity_available;
    assert.strictEqual(batchStock3, 100, 'Remaining finished goods batch stock must be +100 units');

    const soItem3Updated = await db('b2b_sales_order_items').where('id', soItem3Id).first();
    const invoiceTotal3 = soItem3Updated.billable_qty * soItem3Updated.unit_price;
    assert.strictEqual(invoiceTotal3, 100000, 'Invoice total must be ₱100,000');
    console.log('  ✓ SCENARIO 3 PASSED: 1,000 Ordered, 1,100 Produced, 1,000 Delivered, +100 Retained in Finished Goods, ₱100,000 Invoiced.\n');

    // ====================================================================
    // SCENARIO 4: SHORT PRODUCTION (1,000 target, 950 actual, -50 shortage)
    // ====================================================================
    console.log('[5/5] SCENARIO 4: Short Production (950 Produced vs 1,000 Target)');
    const [so4Id] = await db('b2b_sales_orders').insert({
      so_number: `SO-TEST-SCENARIO-4-${runId}`,
      client_id: client.id,
      po_number: `PO-SCENARIO-4-${runId}`,
      order_date: new Date(),
      payment_terms: '30 Days',
      delivery_address: 'Warehouse A',
      subtotal: 100000,
      total_amount: 100000,
      status: 'Confirmed'
    });

    const [soItem4Id] = await db('b2b_sales_order_items').insert({
      sales_order_id: so4Id,
      product_id: product.id,
      ordered_qty: 1000,
      delivered_qty: 0,
      variance_qty: 0,
      billable_qty: 1000,
      foc_qty: 0,
      unit_price: 100.00,
      subtotal: 100000
    });

    const po4 = await productionService.createProductionOrder({
      sales_order_id: so4Id,
      sales_order_item_id: soItem4Id,
      target_quantity: 1000,
      batch_number: `BATCH-SCENARIO-4-${runId}`,
      userId: 1
    });
    await productionService.startProductionOrder(po4.id, 1);

    const out4 = await productionService.recordProductionOutput({
      poId: po4.id,
      output_quantity: 950,
      output_date: new Date(),
      userId: 1
    });

    assert.strictEqual(out4.varianceQty, -50, 'Shortage variance must be -50');
    assert.strictEqual(out4.variance.variance_type, 'SHORT_PRODUCTION', 'Variance type must be SHORT_PRODUCTION');

    // Resolve shortage via Partial Delivery Acceptance
    await productionService.resolveShortage({
      pvId: out4.variance.id,
      resolution_type: 'PARTIAL_DELIVERY_ACCEPTANCE',
      client_accepted: true,
      remarks: 'Client accepted partial delivery of 950 units',
      userId: 1
    });

    const soItem4Updated = await db('b2b_sales_order_items').where('id', soItem4Id).first();
    assert.strictEqual(soItem4Updated.billable_qty, 950, 'Billable quantity must be reduced to 950');

    const invoiceTotal4 = soItem4Updated.billable_qty * soItem4Updated.unit_price;
    assert.strictEqual(invoiceTotal4, 95000, 'Invoice total must be exactly ₱95,000 (NOT ₱100,000)');
    console.log('  ✓ SCENARIO 4 PASSED: 1,000 Target, 950 Produced, -50 Shortage Resolved, Billable reduced to 950, ₱95,000 Invoiced.\n');

    console.log('======================================================================');
    console.log('🎉 ALL 4 MANUFACTURING & VARIANCE TEST SCENARIOS PASSED 100%!');
    console.log('======================================================================');
    process.exit(0);
  } catch (err) {
    console.error('❌ TEST FAILED:', err);
    process.exit(1);
  }
}

runScenarioTests();
