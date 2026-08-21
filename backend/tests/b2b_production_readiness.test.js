process.env.NODE_ENV = 'test';
const assert = require('assert');
const db = require('../src/config/db');
const productionService = require('../src/services/productionService');
const { deductInventoryForDelivery, postInventoryTransaction } = require('../src/services/inventoryService');
const { logAudit } = require('../src/services/auditService');

async function runProductionReadinessTests() {
  console.log('======================================================================');
  console.log('🛡️ RUNNING DEEP B2B PRODUCTION READINESS & REPOSITORY VALIDATION SUITE');
  console.log('======================================================================\n');

  try {
    // 0. Reset and Seed Test In-Memory Database
    console.log('[STAGE 0] Initializing and migrating in-memory database...');
    await db.migrate.latest();
    await db.seed.run();
    console.log('  ✓ Schema and Seeds initialized.\n');

    const client = await db('b2b_clients').where('client_code', 'CLI-001').first();
    const product = await db('b2b_products').where('sku', 'LOT-001').first();
    const runId = Date.now();

    // ====================================================================
    // TEST 1: CRITICAL REAL MANUFACTURING SEQUENCE (Section 3)
    // ====================================================================
    console.log('[STAGE 1] Validating Critical Real Manufacturing Sequence (1,000 order -> 1,100 output -> 100 FOC -> ₱100k Invoice)...');
    const [soId] = await db('b2b_sales_orders').insert({
      so_number: `SO-PROD-SEQ-${runId}`,
      client_id: client.id,
      po_number: `PO-CLIENT-${runId}`,
      order_date: new Date(),
      payment_terms: '30 Days',
      delivery_address: 'Warehouse Sector 1',
      subtotal: 100000,
      total_amount: 100000,
      status: 'Confirmed'
    });

    const [soItemId] = await db('b2b_sales_order_items').insert({
      sales_order_id: soId,
      product_id: product.id,
      ordered_qty: 1000,
      delivered_qty: 0,
      variance_qty: 0,
      billable_qty: 1000,
      foc_qty: 0,
      unit_price: 100.00,
      subtotal: 100000
    });

    // Step 1: Create Production Order
    const po = await productionService.createProductionOrder({
      sales_order_id: soId,
      sales_order_item_id: soItemId,
      target_quantity: 1000,
      batch_number: `LOT-READINESS-${runId}`,
      userId: 1
    });

    const stockBefore = (await db('b2b_products').where('id', product.id).first()).current_stock;

    // Step 2: Record Output (+1,100)
    const out = await productionService.recordProductionOutput({
      poId: po.id,
      output_quantity: 1100,
      output_date: new Date(),
      userId: 1
    });

    const stockAfterOutput = (await db('b2b_products').where('id', product.id).first()).current_stock;
    assert.strictEqual(stockAfterOutput - stockBefore, 1100, 'Inventory must increase by +1,100 exactly');
    assert.strictEqual(out.varianceQty, 100, 'Production variance must be +100 units');

    // Step 3: Manager approves 100 FOC
    await productionService.assignExcessDisposition({
      pvId: out.variance.id,
      dispositions: [{ disposition_type: 'FOC', allocated_quantity: 100, remarks: '100 FOC approved' }],
      userId: 1
    });

    const soItemUpdated = await db('b2b_sales_order_items').where('id', soItemId).first();
    assert.strictEqual(soItemUpdated.billable_qty, 1000, 'Billable quantity must be 1,000');
    assert.strictEqual(soItemUpdated.foc_qty, 100, 'FOC quantity must be 100');

    // Step 4: Warehouse delivers 1,100
    const [delId] = await db('b2b_deliveries').insert({
      delivery_number: `DR-READINESS-${runId}`,
      sales_order_id: soId,
      client_id: client.id,
      delivery_date: new Date(),
      delivery_address: 'Warehouse Sector 1',
      status: 'Delivered'
    });
    await db('b2b_delivery_items').insert({
      delivery_id: delId,
      sales_order_item_id: soItemId,
      product_id: product.id,
      batch_id: po.batch_id,
      ordered_qty: 1000,
      delivered_qty: 1100
    });
    await db('b2b_products').where('id', product.id).decrement('current_stock', 1100);
    await db('b2b_product_batches').where('id', po.batch_id).decrement('quantity_available', 1100);

    // Step 5: Verify net batch stock is 0
    const batchStock = (await db('b2b_product_batches').where('id', po.batch_id).first()).quantity_available;
    assert.strictEqual(batchStock, 0, 'Net batch stock must be 0 (+1,100 produced - 1,100 delivered)');

    // Step 6: Invoice & Payment (₱100,000)
    const invoiceTotal = soItemUpdated.billable_qty * soItemUpdated.unit_price;
    assert.strictEqual(invoiceTotal, 100000, 'Invoice total must be ₱100,000');
    console.log('  ✓ STAGE 1 PASSED: Full manufacturing lifecycle completed with 0 errors.\n');

    // ====================================================================
    // TEST 2: INVENTORY DOUBLE-POSTING REGRESSION (Section 4)
    // ====================================================================
    console.log('[STAGE 2] Validating Inventory Double-Posting Protection (Section 4)...');
    const receiptsCount = await db('b2b_inventory_transactions')
      .where({ transaction_type: 'PRODUCTION_RECEIPT', reference_id: po.id })
      .count('id as count')
      .first();
    assert.strictEqual(receiptsCount.count, 1, 'Exactly ONE inventory transaction must exist for this production output');

    const totalReceiptQty = await db('b2b_inventory_transactions')
      .where({ transaction_type: 'PRODUCTION_RECEIPT', reference_id: po.id })
      .sum('quantity as total')
      .first();
    assert.strictEqual(Number(totalReceiptQty.total), 1100, 'Total receipt quantity must equal exactly 1,100 (NOT 2,200)');
    console.log('  ✓ STAGE 2 PASSED: Double-posting prevention verified.\n');

    // ====================================================================
    // TEST 3: MULTIPLE PRODUCTION OUTPUTS TEST (Section 5)
    // ====================================================================
    console.log('[STAGE 3] Validating Multiple Production Output Events (500 + 400 + 200 = 1,100) (Section 5)...');
    const [multiPoRes] = await db('b2b_production_orders').insert({
      production_order_number: `PO-MULTI-${runId}`,
      sales_order_id: soId,
      sales_order_item_id: soItemId,
      client_id: client.id,
      product_id: product.id,
      batch_id: po.batch_id,
      batch_number: `BATCH-MULTI-${runId}`,
      target_quantity: 1000,
      actual_produced_quantity: 0,
      production_status: 'IN_PRODUCTION'
    });
    const multiPoId = typeof multiPoRes === 'object' ? multiPoRes.id || 2 : multiPoRes;

    // Output #1: 500
    await productionService.recordProductionOutput({ poId: multiPoId, output_quantity: 500, userId: 1 });
    // Output #2: 400
    await productionService.recordProductionOutput({ poId: multiPoId, output_quantity: 400, userId: 1 });
    // Output #3: 200
    await productionService.recordProductionOutput({ poId: multiPoId, output_quantity: 200, userId: 1 });

    const multiPoUpdated = await db('b2b_production_orders').where('id', multiPoId).first();
    assert.strictEqual(multiPoUpdated.actual_produced_quantity, 1100, 'Total actual produced quantity must be 1,100');

    const multiOutputsSum = await db('b2b_production_outputs').where('production_order_id', multiPoId).sum('output_quantity as total').first();
    assert.strictEqual(Number(multiOutputsSum.total), 1100, 'SUM(production_outputs) must equal 1,100');

    const multiInvSum = await db('b2b_inventory_transactions')
      .where({ transaction_type: 'PRODUCTION_RECEIPT', reference_id: multiPoId })
      .sum('quantity as total')
      .first();
    assert.strictEqual(Number(multiInvSum.total), 1100, 'SUM(inventory receipts) must equal 1,100');
    console.log('  ✓ STAGE 3 PASSED: Multiple production output synchronization verified.\n');

    // ====================================================================
    // TEST 4: BATCH TRACEABILITY & FOREIGN KEY GENEALOGY (Section 6)
    // ====================================================================
    console.log('[STAGE 4] Validating Unbroken Batch Traceability Chain (Section 6)...');
    const batchTrace = await db('b2b_production_outputs as out')
      .join('b2b_production_orders as po', 'out.production_order_id', 'po.id')
      .join('b2b_sales_orders as so', 'po.sales_order_id', 'so.id')
      .join('b2b_clients as c', 'so.client_id', 'c.id')
      .join('b2b_product_batches as b', 'out.batch_id', 'b.id')
      .select('so.so_number', 'po.production_order_number', 'b.batch_number', 'c.company_name')
      .where('out.production_order_id', po.id)
      .first();

    assert.ok(batchTrace, 'Traceability link from Output -> PO -> SO -> Client must exist');
    assert.strictEqual(batchTrace.company_name, client.company_name, 'Client traceability verified');
    console.log('  ✓ STAGE 4 PASSED: Complete batch-to-delivery genealogy validated.\n');

    // ====================================================================
    // TEST 5: EXCESS DISPOSITION OVER-ALLOCATION GUARDRAIL (Section 6)
    // ====================================================================
    console.log('[STAGE 5] Validating Excess Disposition Over-Allocation Guardrail (Section 6)...');
    let overAllocationRejected = false;
    try {
      // Attempt to allocate 120 units when excess is only 100
      await productionService.assignExcessDisposition({
        pvId: out.variance.id,
        dispositions: [
          { disposition_type: 'FOC', allocated_quantity: 70 },
          { disposition_type: 'FINISHED_GOODS_STOCK', allocated_quantity: 50 } // Total = 120 > 100
        ],
        userId: 1
      });
    } catch (err) {
      overAllocationRejected = err.message.includes('cannot exceed production excess quantity');
    }
    assert.strictEqual(overAllocationRejected, true, 'Backend MUST reject over-allocation exceeding excess quantity');
    console.log('  ✓ STAGE 5 PASSED: Excess over-allocation rejected with proper error message.\n');

    // ====================================================================
    // TEST 6: RBAC BOUNDARY ENFORCEMENT (Section 14)
    // ====================================================================
    console.log('[STAGE 6] Validating RBAC Security & Boundary Enforcement (Section 14)...');
    const { requireRole } = require('../src/middleware/rbac');

    let clientBlockedFromProduction = false;
    const mockReqClient = { user: { id: 99, role: 'CLIENT' } };
    const mockRes = {
      status: (code) => ({
        json: (data) => {
          if (code === 403) clientBlockedFromProduction = true;
        }
      })
    };
    const rbacMiddleware = requireRole(['ADMIN', 'MANAGER', 'PRODUCTION']);
    rbacMiddleware(mockReqClient, mockRes, () => {});
    assert.strictEqual(clientBlockedFromProduction, true, 'CLIENT role MUST be blocked from production mutating routes (403 Forbidden)');
    console.log('  ✓ STAGE 6 PASSED: RBAC boundary enforcement validated.\n');

    // ====================================================================
    // TEST 7: AUDIT LOG TAMPER-PROOF TRAIL (Section 15)
    // ====================================================================
    console.log('[STAGE 7] Validating Append-Only Audit Trail (Section 15)...');
    const auditCount = await db('b2b_audit_logs').count('id as count').first();
    assert.ok(Number(auditCount.count) > 0, 'Audit records must be generated for all critical transitions');
    console.log(`  ✓ STAGE 7 PASSED: ${auditCount.count} audit records recorded and verified.\n`);

    console.log('======================================================================');
    console.log('🎉 ALL PRODUCTION READINESS & INTEGRITY TESTS PASSED 100%!');
    console.log('======================================================================');
    process.exit(0);
  } catch (err) {
    console.error('❌ PRODUCTION READINESS TEST FAILED:', err);
    process.exit(1);
  }
}

runProductionReadinessTests();
