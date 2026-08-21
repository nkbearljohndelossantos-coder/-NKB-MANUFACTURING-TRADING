const db = require('../config/db');
const { logAudit } = require('./auditService');

/**
 * Transactional physical inventory deduction
 * Strictly deducts the actual delivered quantity dispatched from warehouse.
 */
async function deductInventoryForDelivery({
  deliveryId,
  items, // [{ product_id, batch_id, delivered_qty }]
  userId,
  ipAddress,
  trx
}) {
  for (const item of items) {
    const product = await trx('b2b_products').where('id', item.product_id).forUpdate().first();
    if (!product) {
      throw new Error(`Product with ID ${item.product_id} does not exist.`);
    }

    const previousStock = Number(product.current_stock);
    const deductQty = Number(item.delivered_qty);
    const newStock = previousStock - deductQty;

    // Update master product stock
    await trx('b2b_products').where('id', item.product_id).update({
      current_stock: newStock,
      updated_at: trx.fn.now()
    });

    // If batch specified, deduct batch stock
    if (item.batch_id) {
      const batch = await trx('b2b_product_batches').where('id', item.batch_id).forUpdate().first();
      if (batch) {
        const batchStock = Number(batch.quantity_available) - deductQty;
        await trx('b2b_product_batches').where('id', item.batch_id).update({
          quantity_available: batchStock
        });
      }
    }

    // Record immutable physical inventory movement
    const [txId] = await trx('b2b_inventory_transactions').insert({
      product_id: item.product_id,
      batch_id: item.batch_id || null,
      transaction_type: 'DELIVERY_OUT',
      reference_type: 'DELIVERY',
      reference_id: deliveryId,
      quantity: -deductQty,
      previous_stock: previousStock,
      new_stock: newStock,
      remarks: `Dispatched for Delivery ID #${deliveryId}`,
      created_by: userId
    });

    await logAudit({
      userId,
      action: 'INVENTORY_DEDUCTED',
      entityType: 'b2b_inventory_transactions',
      entityId: txId,
      oldValues: { stock: previousStock },
      newValues: { stock: newStock, deduction: -deductQty },
      reason: `Physical warehouse dispatch for delivery #${deliveryId}`,
      ipAddress,
      trx
    });
  }
}

/**
 * Generic inventory receipt or adjustment posting
 */
async function postInventoryTransaction({
  productId,
  batchId,
  transactionType,
  quantity,
  referenceType,
  referenceId,
  notes,
  userId
}, trx) {
  const runner = trx || db;
  const product = await runner('b2b_products').where('id', productId).forUpdate().first();
  if (!product) throw new Error(`Product with ID ${productId} not found`);

  const previousStock = Number(product.current_stock || 0);
  const newStock = previousStock + Number(quantity);

  await runner('b2b_products').where('id', productId).update({
    current_stock: newStock,
    updated_at: runner.fn.now()
  });

  if (batchId) {
    const batch = await runner('b2b_product_batches').where('id', batchId).forUpdate().first();
    if (batch) {
      const prevBatchStock = Number(batch.quantity_available || 0);
      await runner('b2b_product_batches').where('id', batchId).update({
        quantity_available: prevBatchStock + Number(quantity)
      });
    }
  }

  const [txId] = await runner('b2b_inventory_transactions').insert({
    product_id: productId,
    batch_id: batchId || null,
    transaction_type: transactionType,
    reference_type: referenceType,
    reference_id: referenceId,
    quantity: quantity,
    previous_stock: previousStock,
    new_stock: newStock,
    remarks: notes,
    created_by: userId
  });

  return { id: txId, previousStock, newStock };
}

module.exports = { deductInventoryForDelivery, postInventoryTransaction };

