const db = require('../config/db');
const { deductInventoryForDelivery } = require('../services/inventoryService');
const { logAudit } = require('../services/auditService');
const { generateDocumentHtml } = require('../services/pdfService');

exports.getDeliveries = async (req, res, next) => {
  try {
    const { status, client_id, search } = req.query;
    let query = db('b2b_deliveries')
      .join('b2b_sales_orders', 'b2b_deliveries.sales_order_id', 'b2b_sales_orders.id')
      .join('b2b_clients', 'b2b_deliveries.client_id', 'b2b_clients.id')
      .select(
        'b2b_deliveries.*',
        'b2b_sales_orders.so_number',
        'b2b_clients.company_name as client_company_name',
        'b2b_clients.client_code'
      );

    if (req.user.role === 'CLIENT') {
      query = query.where('b2b_deliveries.client_id', req.user.client_id);
    } else if (client_id) {
      query = query.where('b2b_deliveries.client_id', client_id);
    }

    if (status) {
      query = query.where('b2b_deliveries.status', status);
    }

    if (search) {
      query = query.where(builder => {
        builder.where('b2b_deliveries.delivery_number', 'like', `%${search}%`)
          .orWhere('b2b_sales_orders.so_number', 'like', `%${search}%`)
          .orWhere('b2b_clients.company_name', 'like', `%${search}%`);
      });
    }

    const deliveries = await query.orderBy('b2b_deliveries.id', 'desc');
    res.json({ success: true, data: deliveries });
  } catch (err) {
    next(err);
  }
};

exports.getDeliveryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const delivery = await db('b2b_deliveries')
      .join('b2b_sales_orders', 'b2b_deliveries.sales_order_id', 'b2b_sales_orders.id')
      .join('b2b_clients', 'b2b_deliveries.client_id', 'b2b_clients.id')
      .select(
        'b2b_deliveries.*',
        'b2b_sales_orders.so_number',
        'b2b_clients.company_name',
        'b2b_clients.client_code',
        'b2b_clients.contact_person',
        'b2b_clients.email',
        'b2b_clients.phone',
        'b2b_clients.tin_number'
      )
      .where('b2b_deliveries.id', id)
      .first();

    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found' });
    }

    if (req.user.role === 'CLIENT' && delivery.client_id !== req.user.client_id) {
      return res.status(403).json({ success: false, message: 'Unauthorized to view this delivery' });
    }

    const items = await db('b2b_delivery_items')
      .join('b2b_products', 'b2b_delivery_items.product_id', 'b2b_products.id')
      .leftJoin('b2b_product_batches', 'b2b_delivery_items.batch_id', 'b2b_product_batches.id')
      .select(
        'b2b_delivery_items.*',
        'b2b_products.product_name',
        'b2b_products.sku',
        'b2b_products.unit_of_measure',
        'b2b_product_batches.batch_number'
      )
      .where('b2b_delivery_items.delivery_id', id);

    const variances = await db('b2b_quantity_variances').where({ delivery_id: id });
    const invoices = await db('b2b_invoices').where({ delivery_id: id });

    res.json({
      success: true,
      data: {
        ...delivery,
        items,
        variances,
        invoices
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.createDelivery = async (req, res, next) => {
  const trx = await db.transaction();
  try {
    const {
      sales_order_id,
      delivery_date = new Date().toISOString().split('T')[0],
      driver_name,
      vehicle_plate,
      delivery_address,
      remarks,
      items // [{ sales_order_item_id, product_id, batch_id, delivered_qty, remarks }]
    } = req.body;

    const so = await trx('b2b_sales_orders').where({ id: sales_order_id }).first();
    if (!so) {
      await trx.rollback();
      return res.status(404).json({ success: false, message: 'Sales Order not found' });
    }

    const countResult = await trx('b2b_deliveries').count('id as count').first();
    const count = (Number(countResult.count) || 0) + 1;
    const year = new Date().getFullYear();
    const delivery_number = `DR-${year}-${String(count).padStart(4, '0')}`;

    const [deliveryId] = await trx('b2b_deliveries').insert({
      delivery_number,
      sales_order_id,
      client_id: so.client_id,
      delivery_date,
      driver_name: driver_name || null,
      vehicle_plate: vehicle_plate || null,
      delivery_address: delivery_address || so.delivery_address,
      status: 'Preparing',
      remarks: remarks || null,
      created_by: req.user.id
    });

    for (const item of items) {
      const soItem = await trx('b2b_sales_order_items').where({ id: item.sales_order_item_id }).first();
      const orderedQty = Number(soItem.ordered_qty);
      const deliveredQty = Number(item.delivered_qty);
      const varianceQty = deliveredQty - orderedQty;

      await trx('b2b_delivery_items').insert({
        delivery_id: deliveryId,
        sales_order_item_id: item.sales_order_item_id,
        product_id: item.product_id,
        batch_id: item.batch_id || null,
        ordered_qty: orderedQty,
        delivered_qty: deliveredQty,
        variance_qty: varianceQty,
        remarks: item.remarks || null
      });
    }

    await logAudit({
      userId: req.user.id,
      action: 'CREATE_DELIVERY',
      entityType: 'b2b_deliveries',
      entityId: deliveryId,
      newValues: { delivery_number, sales_order_id, status: 'Preparing' },
      reason: 'Delivery receipt prepared',
      ipAddress: req.ip,
      trx
    });

    await trx.commit();

    const created = await db('b2b_deliveries').where({ id: deliveryId }).first();
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    await trx.rollback();
    next(err);
  }
};

exports.finalizeDelivery = async (req, res, next) => {
  const trx = await db.transaction();
  try {
    const { id } = req.params;
    const delivery = await trx('b2b_deliveries').where({ id }).first();
    if (!delivery) {
      await trx.rollback();
      return res.status(404).json({ success: false, message: 'Delivery not found' });
    }

    if (delivery.status === 'Completed' || delivery.status === 'Delivered') {
      await trx.rollback();
      return res.status(400).json({ success: false, message: 'Delivery has already been finalized' });
    }

    const deliveryItems = await trx('b2b_delivery_items').where({ delivery_id: id });
    if (!deliveryItems.length) {
      await trx.rollback();
      return res.status(400).json({ success: false, message: 'Delivery contains no items' });
    }

    // 1. Transactional Physical Inventory Deduction (Strictly reflects actual delivered physical count)
    await deductInventoryForDelivery({
      deliveryId: id,
      items: deliveryItems.map(d => ({
        product_id: d.product_id,
        batch_id: d.batch_id,
        delivered_qty: d.delivered_qty
      })),
      userId: req.user.id,
      ipAddress: req.ip,
      trx
    });

    // 2. Evaluate Variances & Update Sales Order Items
    let hasVariance = false;
    for (const dItem of deliveryItems) {
      const orderedQty = Number(dItem.ordered_qty);
      const deliveredQty = Number(dItem.delivered_qty);
      const varianceQty = deliveredQty - orderedQty;

      if (varianceQty !== 0) {
        hasVariance = true;
        const varianceType = varianceQty > 0 ? 'Over-Delivery' : 'Under-Delivery';
        const defaultReason = req.body.reason || (varianceQty > 0 ? 'Production Overrun' : 'Warehouse Error');
        const defaultTreatment = req.body.proposed_treatment || (varianceQty > 0 ? 'FOC' : 'Bill Delivered Quantity');

        // Create variance record
        await trx('b2b_quantity_variances').insert({
          delivery_id: id,
          sales_order_id: delivery.sales_order_id,
          sales_order_item_id: dItem.sales_order_item_id,
          product_id: dItem.product_id,
          ordered_qty: orderedQty,
          delivered_qty: deliveredQty,
          variance_qty: varianceQty,
          variance_type: varianceType,
          reason: defaultReason,
          proposed_treatment: defaultTreatment,
          billable_qty: orderedQty, // Default billable before manager override
          foc_qty: varianceQty > 0 ? varianceQty : 0,
          approval_status: 'Pending Approval',
          client_confirmation_required: 0,
          client_confirmation_status: 'Pending'
        });

        // Update SO item with delivered qty and tentative billable
        await trx('b2b_sales_order_items').where({ id: dItem.sales_order_item_id }).update({
          delivered_qty: deliveredQty,
          variance_qty: varianceQty,
          billable_qty: orderedQty,
          foc_qty: varianceQty > 0 ? varianceQty : 0,
          updated_at: trx.fn.now()
        });
      } else {
        // No variance
        await trx('b2b_sales_order_items').where({ id: dItem.sales_order_item_id }).update({
          delivered_qty: deliveredQty,
          variance_qty: 0,
          billable_qty: orderedQty,
          foc_qty: 0,
          updated_at: trx.fn.now()
        });
      }
    }

    const finalStatus = hasVariance ? 'Variance Detected' : 'Delivered';
    await trx('b2b_deliveries').where({ id }).update({
      status: finalStatus,
      received_date: trx.fn.now(),
      updated_at: trx.fn.now()
    });

    await trx('b2b_sales_orders').where({ id: delivery.sales_order_id }).update({
      status: 'Delivered',
      updated_at: trx.fn.now()
    });

    await logAudit({
      userId: req.user.id,
      action: 'FINALIZE_DELIVERY',
      entityType: 'b2b_deliveries',
      entityId: id,
      newValues: { status: finalStatus, hasVariance },
      reason: hasVariance ? 'Delivery finalized with quantity variance detected' : 'Delivery finalized successfully without variance',
      ipAddress: req.ip,
      trx
    });

    await trx.commit();

    res.json({
      success: true,
      message: hasVariance ? 'Delivery finalized. OVER-DELIVERY/VARIANCE DETECTED - Requires Manager Approval' : 'Delivery finalized successfully',
      status: finalStatus,
      hasVariance
    });
  } catch (err) {
    await trx.rollback();
    next(err);
  }
};

exports.getDeliveryPdf = async (req, res, next) => {
  try {
    const { id } = req.params;
    const delivery = await db('b2b_deliveries')
      .join('b2b_sales_orders', 'b2b_deliveries.sales_order_id', 'b2b_sales_orders.id')
      .join('b2b_clients', 'b2b_deliveries.client_id', 'b2b_clients.id')
      .select('b2b_deliveries.*', 'b2b_sales_orders.so_number', 'b2b_clients.company_name', 'b2b_clients.billing_address', 'b2b_clients.delivery_address', 'b2b_clients.tin_number', 'b2b_clients.phone', 'b2b_clients.email', 'b2b_clients.contact_person')
      .where('b2b_deliveries.id', id)
      .first();

    if (!delivery) return res.status(404).send('Delivery not found');

    const items = await db('b2b_delivery_items')
      .join('b2b_products', 'b2b_delivery_items.product_id', 'b2b_products.id')
      .leftJoin('b2b_product_batches', 'b2b_delivery_items.batch_id', 'b2b_product_batches.id')
      .select('b2b_delivery_items.*', 'b2b_products.product_name', 'b2b_products.sku', 'b2b_product_batches.batch_number')
      .where('b2b_delivery_items.delivery_id', id);

    const html = generateDocumentHtml({
      title: 'Delivery Receipt (DR)',
      docNumber: delivery.delivery_number,
      date: delivery.delivery_date,
      client: delivery,
      items: items.map(i => ({
        ...i,
        subtotal: 0,
        unit_price: 0
      })),
      totals: { subtotal: 0, discount_amount: 0, tax_amount: 0, total_amount: 0 }
    });

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    next(err);
  }
};
