const db = require('../config/db');
const { logAudit } = require('../services/auditService');

exports.getVariances = async (req, res, next) => {
  try {
    const { status, delivery_id } = req.query;
    let query = db('b2b_quantity_variances')
      .join('b2b_deliveries', 'b2b_quantity_variances.delivery_id', 'b2b_deliveries.id')
      .join('b2b_sales_orders', 'b2b_quantity_variances.sales_order_id', 'b2b_sales_orders.id')
      .join('b2b_clients', 'b2b_deliveries.client_id', 'b2b_clients.id')
      .join('b2b_products', 'b2b_quantity_variances.product_id', 'b2b_products.id')
      .select(
        'b2b_quantity_variances.*',
        'b2b_deliveries.delivery_number',
        'b2b_sales_orders.so_number',
        'b2b_clients.company_name as client_company_name',
        'b2b_products.product_name',
        'b2b_products.sku',
        'b2b_products.unit_price'
      );

    if (req.user.role === 'CLIENT') {
      query = query.where('b2b_deliveries.client_id', req.user.client_id);
    }

    if (status) {
      query = query.where('b2b_quantity_variances.approval_status', status);
    }

    if (delivery_id) {
      query = query.where('b2b_quantity_variances.delivery_id', delivery_id);
    }

    const variances = await query.orderBy('b2b_quantity_variances.id', 'desc');
    res.json({ success: true, data: variances });
  } catch (err) {
    next(err);
  }
};

exports.reviewVariance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason, proposed_treatment, billable_qty, foc_qty, remarks, client_confirmation_required } = req.body;

    const variance = await db('b2b_quantity_variances').where({ id }).first();
    if (!variance) {
      return res.status(404).json({ success: false, message: 'Variance not found' });
    }

    await db('b2b_quantity_variances').where({ id }).update({
      reason: reason || variance.reason,
      proposed_treatment: proposed_treatment || variance.proposed_treatment,
      billable_qty: billable_qty !== undefined ? billable_qty : variance.billable_qty,
      foc_qty: foc_qty !== undefined ? foc_qty : variance.foc_qty,
      client_confirmation_required: client_confirmation_required !== undefined ? (client_confirmation_required ? 1 : 0) : variance.client_confirmation_required,
      approval_remarks: remarks || variance.approval_remarks,
      updated_at: db.fn.now()
    });

    await logAudit({
      userId: req.user.id,
      action: 'REVIEW_VARIANCE',
      entityType: 'b2b_quantity_variances',
      entityId: id,
      oldValues: variance,
      newValues: req.body,
      reason: 'Warehouse/Sales updated variance review details',
      ipAddress: req.ip
    });

    const updated = await db('b2b_quantity_variances').where({ id }).first();
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

exports.approveVariance = async (req, res, next) => {
  const trx = await db.transaction();
  try {
    const { id } = req.params;
    const { status = 'Approved', billable_qty, foc_qty, reason, treatment, remarks } = req.body;

    const variance = await trx('b2b_quantity_variances').where({ id }).first();
    if (!variance) {
      await trx.rollback();
      return res.status(404).json({ success: false, message: 'Variance record not found' });
    }

    const finalBillable = billable_qty !== undefined ? Number(billable_qty) : Number(variance.billable_qty);
    const finalFoc = foc_qty !== undefined ? Number(foc_qty) : Number(variance.foc_qty);

    // Update variance approval record
    await trx('b2b_quantity_variances').where({ id }).update({
      approval_status: status,
      billable_qty: finalBillable,
      foc_qty: finalFoc,
      reason: reason || variance.reason,
      proposed_treatment: treatment || variance.proposed_treatment,
      manager_id: req.user.id,
      approval_date: trx.fn.now(),
      approval_remarks: remarks || null,
      updated_at: trx.fn.now()
    });

    // Update sales order line item with approved billable and foc quantities
    const soItem = await trx('b2b_sales_order_items').where({ id: variance.sales_order_item_id }).first();
    if (soItem) {
      const unitPrice = Number(soItem.unit_price);
      const discount = Number(soItem.discount_percent || 0);
      const newSubtotal = finalBillable * unitPrice * (1 - discount / 100);

      await trx('b2b_sales_order_items').where({ id: variance.sales_order_item_id }).update({
        billable_qty: finalBillable,
        foc_qty: finalFoc,
        subtotal: newSubtotal,
        updated_at: trx.fn.now()
      });
    }

    // Check if all variances for this delivery are approved
    const remainingPending = await trx('b2b_quantity_variances')
      .where({ delivery_id: variance.delivery_id, approval_status: 'Pending Approval' })
      .count('id as count')
      .first();

    if (Number(remainingPending.count) === 0) {
      await trx('b2b_deliveries').where({ id: variance.delivery_id }).update({
        status: 'Completed',
        updated_at: trx.fn.now()
      });
    }

    await logAudit({
      userId: req.user.id,
      action: 'APPROVE_VARIANCE',
      entityType: 'b2b_quantity_variances',
      entityId: id,
      oldValues: { status: variance.approval_status, billable_qty: variance.billable_qty, foc_qty: variance.foc_qty },
      newValues: { status, billable_qty: finalBillable, foc_qty: finalFoc, manager_id: req.user.id },
      reason: `Manager decision: ${status} (${finalFoc} FOC, ${finalBillable} Billable)`,
      ipAddress: req.ip,
      trx
    });

    await trx.commit();

    res.json({
      success: true,
      message: `Variance ${status.toLowerCase()} successfully. Billable Qty: ${finalBillable}, FOC Qty: ${finalFoc}`,
      billable_qty: finalBillable,
      foc_qty: finalFoc
    });
  } catch (err) {
    await trx.rollback();
    next(err);
  }
};

exports.clientConfirmVariance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body; // status: 'Accepted Additional Qty' | 'Accepted as FOC' | 'Rejected'

    const variance = await db('b2b_quantity_variances').where({ id }).first();
    if (!variance) {
      return res.status(404).json({ success: false, message: 'Variance not found' });
    }

    await db('b2b_quantity_variances').where({ id }).update({
      client_confirmation_status: status,
      client_confirmed_by: req.user.full_name || req.user.username,
      client_confirmation_date: db.fn.now(),
      client_remarks: remarks || null,
      updated_at: db.fn.now()
    });

    await logAudit({
      userId: req.user.id,
      action: 'CLIENT_CONFIRM_VARIANCE',
      entityType: 'b2b_quantity_variances',
      entityId: id,
      newValues: { client_confirmation_status: status, client_remarks: remarks },
      reason: `Client confirmed variance: ${status}`,
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'Variance confirmation recorded successfully' });
  } catch (err) {
    next(err);
  }
};
