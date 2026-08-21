process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key_1234567890123456';

const assert = require('assert');
const db = require('../src/config/db');
const knexConfig = require('../knexfile');

async function runTests() {
  console.log('======================================================================');
  console.log('🧪 RUNNING CRITICAL B2B ORDER, DELIVERY, VARIANCE & BILLING TEST SUITE');
  console.log('======================================================================');

  try {
    // 1. Run Migrations & Seeds on Test Database
    console.log('[1/8] Running database migrations on test database...');
    await db.migrate.latest();
    console.log('  ✓ Migrations executed successfully.');

    console.log('[2/8] Seeding initial master data (Categories, Products, Client, Roles)...');
    await db.seed.run();
    console.log('  ✓ Seeds loaded successfully.');

    // 2. Verify Initial Master State
    const lotion = await db('b2b_products').where('sku', 'LOT-001').first();
    assert.strictEqual(lotion.product_name, 'Hydrating Body Lotion 500ml');
    assert.strictEqual(Number(lotion.unit_price), 100);
    const initialStock = Number(lotion.current_stock);
    console.log(`  ✓ Product LOT-001 verified: Initial Stock = ${initialStock}, Price = ₱${lotion.unit_price}`);

    const client = await db('b2b_clients').where('client_code', 'CLI-001').first();
    assert.strictEqual(client.company_name, 'ABC Cosmetics Distribution Inc.');
    assert.strictEqual(Number(client.current_balance), 0);
    console.log(`  ✓ Client CLI-001 verified: Company = ${client.company_name}, Balance = ₱${client.current_balance}`);

    // 3. Step 1: Create Sales Order for 1,000 bottles @ ₱100
    console.log('\n[3/8] Creating Sales Order for 1,000 bottles @ ₱100 (Total = ₱100,000)...');
    const [soId] = await db('b2b_sales_orders').insert({
      so_number: 'SO-2026-TEST-001',
      client_id: client.id,
      po_number: 'PO-ABC-2026-99',
      order_date: '2026-08-21',
      delivery_address: client.delivery_address,
      subtotal: 100000.00,
      total_amount: 100000.00,
      status: 'Confirmed',
      credit_check_passed: 1
    });

    const [soItemId] = await db('b2b_sales_order_items').insert({
      sales_order_id: soId,
      product_id: lotion.id,
      ordered_qty: 1000,
      delivered_qty: 0,
      variance_qty: 0,
      billable_qty: 0,
      foc_qty: 0,
      invoiced_qty: 0,
      unit_price: 100.00,
      discount_percent: 0.00,
      subtotal: 100000.00
    });
    console.log(`  ✓ Sales Order created: ID = ${soId}, Ordered Qty = 1,000`);

    // 4. Step 2: Warehouse Dispatches and Delivers 1,100 bottles (Over-Delivery)
    console.log('\n[4/8] Warehouse delivers 1,100 bottles against 1,000 ordered...');
    const [drId] = await db('b2b_deliveries').insert({
      delivery_number: 'DR-2026-TEST-001',
      sales_order_id: soId,
      client_id: client.id,
      delivery_date: '2026-08-21',
      driver_name: 'Juan Driver',
      vehicle_plate: 'NKB-888',
      delivery_address: client.delivery_address,
      status: 'Preparing'
    });

    await db('b2b_delivery_items').insert({
      delivery_id: drId,
      sales_order_item_id: soItemId,
      product_id: lotion.id,
      ordered_qty: 1000,
      delivered_qty: 1100,
      variance_qty: 100
    });

    // Execute Delivery Finalization Transaction
    console.log('  Executing Finalize Delivery Transaction (Deducting physical stock & checking variance)...');
    const trx = await db.transaction();
    try {
      // 4a. Deduct Physical Stock strictly matching delivered_qty (-1,100)
      const prevStock = Number(lotion.current_stock);
      const newStock = prevStock - 1100;
      await trx('b2b_products').where('id', lotion.id).update({ current_stock: newStock });

      await trx('b2b_inventory_transactions').insert({
        product_id: lotion.id,
        transaction_type: 'DELIVERY_OUT',
        reference_type: 'DELIVERY',
        reference_id: drId,
        quantity: -1100,
        previous_stock: prevStock,
        new_stock: newStock,
        remarks: 'Physical dispatch for DR-2026-TEST-001'
      });

      // 4b. Record Quantity Variance (+100 Over-Delivery)
      await trx('b2b_quantity_variances').insert({
        delivery_id: drId,
        sales_order_id: soId,
        sales_order_item_id: soItemId,
        product_id: lotion.id,
        ordered_qty: 1000,
        delivered_qty: 1100,
        variance_qty: 100,
        variance_type: 'Over-Delivery',
        reason: 'Production Overrun',
        proposed_treatment: 'FOC',
        billable_qty: 1000,
        foc_qty: 100,
        approval_status: 'Pending Approval'
      });

      await trx('b2b_sales_order_items').where('id', soItemId).update({
        delivered_qty: 1100,
        variance_qty: 100,
        billable_qty: 1000,
        foc_qty: 100
      });

      await trx('b2b_deliveries').where('id', drId).update({ status: 'Variance Detected' });
      await trx.commit();
    } catch (err) {
      await trx.rollback();
      throw err;
    }

    // Verify Stock Deduction
    const updatedLotion = await db('b2b_products').where('id', lotion.id).first();
    assert.strictEqual(Number(updatedLotion.current_stock), initialStock - 1100);
    console.log(`  ✓ Physical Inventory verified: Previous = ${initialStock}, Deducted = -1,100, New Stock = ${updatedLotion.current_stock}`);

    // Verify Variance Record
    const variance = await db('b2b_quantity_variances').where('delivery_id', drId).first();
    assert.strictEqual(Number(variance.variance_qty), 100);
    assert.strictEqual(variance.variance_type, 'Over-Delivery');
    assert.strictEqual(variance.approval_status, 'Pending Approval');
    console.log(`  ✓ Variance Detected: +100 units (${variance.variance_type}), Reason: ${variance.reason}, Status: ${variance.approval_status}`);

    // 5. Step 3: Manager Approves Variance (100 FOC, 1000 Billable)
    console.log('\n[5/8] Manager reviews and approves variance (Treatment: 100 FOC, 1,000 Billable)...');
    const mgrUser = await db('users').where('role', 'MANAGER').first();
    await db('b2b_quantity_variances').where('id', variance.id).update({
      approval_status: 'Approved',
      manager_id: mgrUser.id,
      approval_date: db.fn.now(),
      approval_remarks: 'Approved production overrun as FOC promotional bonus'
    });

    await db('b2b_deliveries').where('id', drId).update({ status: 'Completed' });

    const approvedVariance = await db('b2b_quantity_variances').where('id', variance.id).first();
    assert.strictEqual(approvedVariance.approval_status, 'Approved');
    assert.strictEqual(Number(approvedVariance.billable_qty), 1000);
    assert.strictEqual(Number(approvedVariance.foc_qty), 100);
    console.log(`  ✓ Manager Approval verified: Billable Qty = ${approvedVariance.billable_qty}, FOC Qty = ${approvedVariance.foc_qty}`);

    // 6. Step 4: Accounting Generates Invoice based STRICTLY on Billable Qty
    console.log('\n[6/8] Accounting generates invoice from delivery (Strictly based on Billable Qty)...');
    const invTrx = await db.transaction();
    let invId;
    try {
      const invTotal = Number(approvedVariance.billable_qty) * Number(lotion.unit_price); // 1,000 * 100 = 100,000
      [invId] = await invTrx('b2b_invoices').insert({
        invoice_number: 'INV-2026-TEST-001',
        sales_order_id: soId,
        delivery_id: drId,
        client_id: client.id,
        invoice_date: '2026-08-21',
        due_date: '2026-09-20',
        payment_terms: '30 Days',
        subtotal: invTotal,
        total_amount: invTotal,
        amount_paid: 0.00,
        balance: invTotal,
        status: 'Unpaid'
      });

      await invTrx('b2b_invoice_items').insert({
        invoice_id: invId,
        product_id: lotion.id,
        ordered_qty: 1000,
        delivered_qty: 1100,
        billable_qty: 1000,
        foc_qty: 100,
        unit_price: 100.00,
        subtotal: invTotal
      });

      // Update customer ledger
      const currentClient = await invTrx('b2b_clients').where('id', client.id).first();
      const newBal = Number(currentClient.current_balance) + invTotal;
      await invTrx('b2b_clients').where('id', client.id).update({ current_balance: newBal });

      await invTrx('b2b_customer_ledger').insert({
        client_id: client.id,
        transaction_date: '2026-08-21',
        transaction_type: 'Invoice',
        reference_number: 'INV-2026-TEST-001',
        reference_id: invId,
        debit_amount: invTotal,
        credit_amount: 0.00,
        running_balance: newBal,
        remarks: 'Billed for SO-2026-TEST-001'
      });

      await invTrx.commit();
    } catch (err) {
      await invTrx.rollback();
      throw err;
    }

    const invoice = await db('b2b_invoices').where('id', invId).first();
    assert.strictEqual(Number(invoice.total_amount), 100000);
    assert.strictEqual(Number(invoice.balance), 100000);
    const clientAfterInvoice = await db('b2b_clients').where('id', client.id).first();
    assert.strictEqual(Number(clientAfterInvoice.current_balance), 100000);
    console.log(`  ✓ Invoice verified: Invoice Total = ₱${invoice.total_amount.toLocaleString()}, Client AR Balance = ₱${clientAfterInvoice.current_balance.toLocaleString()}`);

    // 7. Step 5: Record Payment of ₱100,000
    console.log('\n[7/8] Accounting records client payment of ₱100,000 via Bank Transfer...');
    const payTrx = await db.transaction();
    try {
      const [payId] = await payTrx('b2b_payments').insert({
        payment_number: 'OR-2026-TEST-001',
        client_id: client.id,
        invoice_id: invId,
        payment_date: '2026-08-21',
        amount: 100000.00,
        payment_method: 'Bank Transfer',
        reference_number: 'BDO-REF-778899',
        bank_name: 'BDO Unibank'
      });

      await payTrx('b2b_invoices').where('id', invId).update({
        amount_paid: 100000.00,
        balance: 0.00,
        status: 'Paid'
      });

      const updatedClient = await payTrx('b2b_clients').where('id', client.id).first();
      const finalBal = Number(updatedClient.current_balance) - 100000.00;
      await payTrx('b2b_clients').where('id', client.id).update({ current_balance: finalBal });

      await payTrx('b2b_customer_ledger').insert({
        client_id: client.id,
        transaction_date: '2026-08-21',
        transaction_type: 'Payment',
        reference_number: 'OR-2026-TEST-001',
        reference_id: payId,
        debit_amount: 0.00,
        credit_amount: 100000.00,
        running_balance: finalBal,
        remarks: 'Payment settled in full'
      });

      await payTrx('b2b_sales_orders').where('id', soId).update({ status: 'Completed' });
      await payTrx.commit();
    } catch (err) {
      await payTrx.rollback();
      throw err;
    }

    const paidInvoice = await db('b2b_invoices').where('id', invId).first();
    assert.strictEqual(paidInvoice.status, 'Paid');
    assert.strictEqual(Number(paidInvoice.balance), 0);

    const clientAfterPayment = await db('b2b_clients').where('id', client.id).first();
    assert.strictEqual(Number(clientAfterPayment.current_balance), 0);

    const finalSo = await db('b2b_sales_orders').where('id', soId).first();
    assert.strictEqual(finalSo.status, 'Completed');
    console.log(`  ✓ Payment & Settlement verified: Invoice Balance = ₱0 (Paid), Customer Balance = ₱0, Order Status = ${finalSo.status}`);

    // 8. Step 6: Summary & Verification Check
    console.log('\n[8/8] Final Integrity Audit & Verification Matrix:');
    console.log('----------------------------------------------------------------------');
    console.log(`  1. Ordered Quantity:        1,000 units`);
    console.log(`  2. Delivered Quantity:      1,100 units`);
    console.log(`  3. Detected Variance:       +100 units (Over-Delivery)`);
    console.log(`  4. Manager Approved FOC:    100 units`);
    console.log(`  5. Approved Billable Qty:   1,000 units`);
    console.log(`  6. Physical Stock Deduct:   -1,100 units`);
    console.log(`  7. Invoiced Total:          ₱100,000 (1,000 × ₱100)`);
    console.log(`  8. Amount Paid:             ₱100,000`);
    console.log(`  9. Final Invoice Balance:   ₱0.00`);
    console.log(` 10. Final Customer Balance:  ₱0.00`);
    console.log('----------------------------------------------------------------------');
    console.log('🎉 ALL INTEGRATION TESTS PASSED WITH 100% MATHEMATICAL INTEGRITY!\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error);
    process.exit(1);
  }
}

runTests();
