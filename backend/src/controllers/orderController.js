const db = require('../config/db');
const { logAudit } = require('../services/auditService');
const { checkClientCredit } = require('../services/ledgerService');
const { generateDocumentHtml } = require('../services/pdfService');

exports.getOrders = async (req, res, next) => {
  try {
    const { status, client_id, search } = req.query;
    let query = db('b2b_sales_orders')
      .join('b2b_clients', 'b2b_sales_orders.client_id', 'b2b_clients.id')
      .select(
        'b2b_sales_orders.*',
        'b2b_clients.company_name as client_company_name',
        'b2b_clients.client_code as client_code'
      );

    // If client portal, restrict to own orders
    if (req.user.role === 'CLIENT') {
      if (!req.user.client_id) {
        return res.status(403).json({ success: false, message: 'No client profile linked to account' });
      }
      query = query.where('b2b_sales_orders.client_id', req.user.client_id);
    } else if (client_id) {
      query = query.where('b2b_sales_orders.client_id', client_id);
    }

    if (status) {
      query = query.where('b2b_sales_orders.status', status);
    }

    if (search) {
      query = query.where(builder => {
        builder.where('b2b_sales_orders.so_number', 'like', `%${search}%`)
          .orWhere('b2b_sales_orders.po_number', 'like', `%${search}%`)
          .orWhere('b2b_clients.company_name', 'like', `%${search}%`);
      });
    }

    const orders = await query.orderBy('b2b_sales_orders.id', 'desc');
    res.json({ success: true, data: orders });
  } catch (err) {
    next(err);
  }
};

exports.getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await db('b2b_sales_orders')
      .join('b2b_clients', 'b2b_sales_orders.client_id', 'b2b_clients.id')
      .select(
        'b2b_sales_orders.*',
        'b2b_clients.company_name',
        'b2b_clients.client_code',
        'b2b_clients.contact_person',
        'b2b_clients.email',
        'b2b_clients.phone',
        'b2b_clients.tin_number',
        'b2b_clients.credit_limit',
        'b2b_clients.current_balance'
      )
      .where('b2b_sales_orders.id', id)
      .first();

    if (!order) {
      return res.status(404).json({ success: false, message: 'Sales Order not found' });
    }

    if (req.user.role === 'CLIENT' && order.client_id !== req.user.client_id) {
      return res.status(403).json({ success: false, message: 'Unauthorized to view this order' });
    }

    const items = await db('b2b_sales_order_items')
      .join('b2b_products', 'b2b_sales_order_items.product_id', 'b2b_products.id')
      .select(
        'b2b_sales_order_items.*',
        'b2b_products.product_name',
        'b2b_products.sku',
        'b2b_products.unit_of_measure'
      )
      .where('b2b_sales_order_items.sales_order_id', id);

    const deliveries = await db('b2b_deliveries').where({ sales_order_id: id }).orderBy('id', 'desc');
    const invoices = await db('b2b_invoices').where({ sales_order_id: id }).orderBy('id', 'desc');
    const variances = await db('b2b_quantity_variances').where({ sales_order_id: id }).orderBy('id', 'desc');

    res.json({
      success: true,
      data: {
        ...order,
        items,
        deliveries,
        invoices,
        variances
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.createOrder = async (req, res, next) => {
  const trx = await db.transaction();
  try {
    const {
      client_id,
      po_number,
      order_date = new Date().toISOString().split('T')[0],
      requested_delivery_date,
      payment_terms,
      delivery_address,
      items, // [{ product_id, ordered_qty, unit_price, discount_percent }]
      remarks
    } = req.body;

    const targetClientId = req.user.role === 'CLIENT' ? req.user.client_id : client_id;
    if (!targetClientId) {
      await trx.rollback();
      return res.status(400).json({ success: false, message: 'Client ID is required' });
    }

    if (!items || !items.length) {
      await trx.rollback();
      return res.status(400).json({ success: false, message: 'At least one line item is required' });
    }

    const client = await trx('b2b_clients').where({ id: targetClientId }).first();
    if (!client) {
      await trx.rollback();
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    // Calculate totals and validate quantities
    let subtotal = 0;
    const sanitizedItems = [];
    for (const item of items) {
      const qty = Number(item.ordered_qty);
      const price = Number(item.unit_price);
      const disc = Number(item.discount_percent || 0);

      if (qty <= 0) {
        await trx.rollback();
        return res.status(400).json({ success: false, message: 'Ordered quantity must be greater than 0' });
      }

      const lineTotal = qty * price * (1 - disc / 100);
      subtotal += lineTotal;

      sanitizedItems.push({
        product_id: item.product_id,
        ordered_qty: qty,
        delivered_qty: 0,
        variance_qty: 0,
        billable_qty: 0,
        foc_qty: 0,
        invoiced_qty: 0,
        unit_price: price,
        discount_percent: disc,
        subtotal: lineTotal
      });
    }

    // Check Credit Limits
    const creditCheck = await checkClientCredit(targetClientId, subtotal, trx);
    let creditPassed = 1;
    let initialStatus = req.user.role === 'CLIENT' ? 'Submitted' : 'Submitted';

    if (creditCheck.isExceeded) {
      creditPassed = 0;
      if (creditCheck.action === 'Block Order') {
        await trx.rollback();
        return res.status(400).json({
          success: false,
          message: `Order Blocked: Credit limit exceeded. Available credit: ₱${creditCheck.availableCredit.toLocaleString()}, Order amount: ₱${subtotal.toLocaleString()}`
        });
      }
    }

    // Generate SO Number
    const countResult = await trx('b2b_sales_orders').count('id as count').first();
    const count = (Number(countResult.count) || 0) + 1;
    const year = new Date().getFullYear();
    const so_number = `SO-${year}-${String(count).padStart(4, '0')}`;

    const [orderId] = await trx('b2b_sales_orders').insert({
      so_number,
      client_id: targetClientId,
      po_number: po_number || null,
      order_date,
      requested_delivery_date: requested_delivery_date || null,
      payment_terms: payment_terms || client.payment_terms || '30 Days',
      delivery_address: delivery_address || client.delivery_address,
      salesperson_id: req.user.role !== 'CLIENT' ? req.user.id : null,
      subtotal,
      discount_amount: 0.00,
      tax_amount: 0.00,
      total_amount: subtotal,
      status: initialStatus,
      credit_check_passed: creditPassed,
      remarks: remarks || null
    });

    for (const item of sanitizedItems) {
      await trx('b2b_sales_order_items').insert({
        sales_order_id: orderId,
        ...item
      });
    }

    await logAudit({
      userId: req.user.id,
      action: 'CREATE_SALES_ORDER',
      entityType: 'b2b_sales_orders',
      entityId: orderId,
      newValues: { so_number, client_id: targetClientId, subtotal, credit_check_passed: creditPassed },
      reason: 'New Sales Order placed',
      ipAddress: req.ip,
      trx
    });

    await trx.commit();

    const createdOrder = await db('b2b_sales_orders').where({ id: orderId }).first();
    res.status(201).json({
      success: true,
      data: createdOrder,
      creditWarning: !creditPassed ? 'Credit limit exceeded; requires Manager approval' : undefined
    });
  } catch (err) {
    await trx.rollback();
    next(err);
  }
};

exports.confirmOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await db('b2b_sales_orders').where({ id }).first();
    if (!order) {
      return res.status(404).json({ success: false, message: 'Sales Order not found' });
    }

    if (order.status === 'Cancelled' || order.status === 'Completed') {
      return res.status(400).json({ success: false, message: `Cannot confirm an order in ${order.status} state` });
    }

    await db('b2b_sales_orders').where({ id }).update({
      status: 'Confirmed',
      updated_at: db.fn.now()
    });

    await logAudit({
      userId: req.user.id,
      action: 'CONFIRM_SALES_ORDER',
      entityType: 'b2b_sales_orders',
      entityId: id,
      oldValues: { status: order.status },
      newValues: { status: 'Confirmed' },
      reason: 'Sales order confirmed for production/preparation',
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'Order confirmed successfully' });
  } catch (err) {
    next(err);
  }
};

exports.overrideCredit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await db('b2b_sales_orders').where({ id }).first();
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    await db('b2b_sales_orders').where({ id }).update({
      credit_check_passed: 1,
      credit_override_by: req.user.id,
      status: 'Confirmed',
      updated_at: db.fn.now()
    });

    await logAudit({
      userId: req.user.id,
      action: 'OVERRIDE_CREDIT_LIMIT',
      entityType: 'b2b_sales_orders',
      entityId: id,
      reason: req.body.reason || 'Manager credit limit override',
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'Credit limit overridden and order confirmed' });
  } catch (err) {
    next(err);
  }
};

exports.getOrderPdf = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await db('b2b_sales_orders')
      .join('b2b_clients', 'b2b_sales_orders.client_id', 'b2b_clients.id')
      .select('b2b_sales_orders.*', 'b2b_clients.company_name', 'b2b_clients.billing_address', 'b2b_clients.delivery_address', 'b2b_clients.tin_number', 'b2b_clients.phone', 'b2b_clients.email', 'b2b_clients.contact_person')
      .where('b2b_sales_orders.id', id)
      .first();

    if (!order) return res.status(404).send('Order not found');

    const items = await db('b2b_sales_order_items')
      .join('b2b_products', 'b2b_sales_order_items.product_id', 'b2b_products.id')
      .select('b2b_sales_order_items.*', 'b2b_products.product_name', 'b2b_products.sku')
      .where('b2b_sales_order_items.sales_order_id', id);

    const html = generateDocumentHtml({
      title: 'Sales Order Voucher',
      docNumber: order.so_number,
      date: order.order_date,
      client: order,
      items,
      totals: {
        subtotal: order.subtotal,
        discount_amount: order.discount_amount,
        tax_amount: order.tax_amount,
        total_amount: order.total_amount
      }
    });

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    next(err);
  }
};
