const db = require('../config/db');
const { postDebitToCustomerLedger } = require('../services/ledgerService');
const { logAudit } = require('../services/auditService');
const { generateDocumentHtml } = require('../services/pdfService');

exports.getInvoices = async (req, res, next) => {
  try {
    const { status, client_id, search } = req.query;
    let query = db('b2b_invoices')
      .join('b2b_sales_orders', 'b2b_invoices.sales_order_id', 'b2b_sales_orders.id')
      .join('b2b_clients', 'b2b_invoices.client_id', 'b2b_clients.id')
      .select(
        'b2b_invoices.*',
        'b2b_sales_orders.so_number',
        'b2b_clients.company_name as client_company_name',
        'b2b_clients.client_code'
      );

    if (req.user.role === 'CLIENT') {
      query = query.where('b2b_invoices.client_id', req.user.client_id);
    } else if (client_id) {
      query = query.where('b2b_invoices.client_id', client_id);
    }

    if (status) {
      query = query.where('b2b_invoices.status', status);
    }

    if (search) {
      query = query.where(builder => {
        builder.where('b2b_invoices.invoice_number', 'like', `%${search}%`)
          .orWhere('b2b_sales_orders.so_number', 'like', `%${search}%`)
          .orWhere('b2b_clients.company_name', 'like', `%${search}%`);
      });
    }

    const invoices = await query.orderBy('b2b_invoices.id', 'desc');
    res.json({ success: true, data: invoices });
  } catch (err) {
    next(err);
  }
};

exports.getInvoiceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const invoice = await db('b2b_invoices')
      .join('b2b_sales_orders', 'b2b_invoices.sales_order_id', 'b2b_sales_orders.id')
      .join('b2b_clients', 'b2b_invoices.client_id', 'b2b_clients.id')
      .select(
        'b2b_invoices.*',
        'b2b_sales_orders.so_number',
        'b2b_clients.company_name',
        'b2b_clients.client_code',
        'b2b_clients.contact_person',
        'b2b_clients.email',
        'b2b_clients.phone',
        'b2b_clients.tin_number',
        'b2b_clients.billing_address',
        'b2b_clients.delivery_address'
      )
      .where('b2b_invoices.id', id)
      .first();

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    if (req.user.role === 'CLIENT' && invoice.client_id !== req.user.client_id) {
      return res.status(403).json({ success: false, message: 'Unauthorized to view this invoice' });
    }

    const items = await db('b2b_invoice_items')
      .join('b2b_products', 'b2b_invoice_items.product_id', 'b2b_products.id')
      .select(
        'b2b_invoice_items.*',
        'b2b_products.product_name',
        'b2b_products.sku',
        'b2b_products.unit_of_measure'
      )
      .where('b2b_invoice_items.invoice_id', id);

    const payments = await db('b2b_payments').where({ invoice_id: id }).orderBy('id', 'desc');

    res.json({
      success: true,
      data: {
        ...invoice,
        items,
        payments
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.generateInvoiceFromDelivery = async (req, res, next) => {
  const trx = await db.transaction();
  try {
    const { deliveryId } = req.params;
    const { invoice_date = new Date().toISOString().split('T')[0], payment_terms } = req.body;

    const delivery = await trx('b2b_deliveries').where({ id: deliveryId }).first();
    if (!delivery) {
      await trx.rollback();
      return res.status(404).json({ success: false, message: 'Delivery not found' });
    }

    // Check if variance is still pending approval
    const pendingVariances = await trx('b2b_quantity_variances')
      .where({ delivery_id: deliveryId, approval_status: 'Pending Approval' })
      .count('id as count')
      .first();

    if (Number(pendingVariances.count) > 0) {
      await trx.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cannot generate invoice: Pending quantity variances must be approved by a Manager first.'
      });
    }

    // Check if already invoiced
    const existingInvoice = await trx('b2b_invoices').where({ delivery_id: deliveryId }).first();
    if (existingInvoice) {
      await trx.rollback();
      return res.status(400).json({ success: false, message: `Delivery already invoiced under ${existingInvoice.invoice_number}` });
    }

    const so = await trx('b2b_sales_orders').where({ id: delivery.sales_order_id }).first();
    const client = await trx('b2b_clients').where({ id: delivery.client_id }).first();
    const deliveryItems = await trx('b2b_delivery_items').where({ delivery_id: deliveryId });

    // Generate Invoice Number
    const countResult = await trx('b2b_invoices').count('id as count').first();
    const count = (Number(countResult.count) || 0) + 1;
    const year = new Date().getFullYear();
    const invoice_number = `INV-${year}-${String(count).padStart(4, '0')}`;

    // Compute Invoice Lines using approved BILLABLE QUANTITY
    let subtotal = 0;
    const invoiceItemsData = [];

    for (const dItem of deliveryItems) {
      const soItem = await trx('b2b_sales_order_items').where({ id: dItem.sales_order_item_id }).first();
      const unitPrice = Number(soItem.unit_price);
      const billableQty = Number(soItem.billable_qty);
      const focQty = Number(soItem.foc_qty || 0);
      const lineSubtotal = billableQty * unitPrice;

      subtotal += lineSubtotal;

      invoiceItemsData.push({
        product_id: dItem.product_id,
        ordered_qty: dItem.ordered_qty,
        delivered_qty: dItem.delivered_qty,
        billable_qty: billableQty,
        foc_qty: focQty,
        unit_price: unitPrice,
        discount_amount: 0.00,
        tax_amount: 0.00,
        subtotal: lineSubtotal
      });

      // Update invoiced_qty on SO item
      await trx('b2b_sales_order_items').where({ id: soItem.id }).update({
        invoiced_qty: billableQty,
        updated_at: trx.fn.now()
      });
    }

    // Due Date calculation (default 30 days)
    const terms = payment_terms || client.payment_terms || '30 Days';
    let daysToAdd = 30;
    if (terms.includes('15')) daysToAdd = 15;
    else if (terms.includes('7')) daysToAdd = 7;
    else if (terms.includes('60')) daysToAdd = 60;
    else if (terms.includes('COD')) daysToAdd = 0;

    const dueDateObj = new Date(invoice_date);
    dueDateObj.setDate(dueDateObj.getDate() + daysToAdd);
    const due_date = dueDateObj.toISOString().split('T')[0];

    const [invoiceId] = await trx('b2b_invoices').insert({
      invoice_number,
      sales_order_id: delivery.sales_order_id,
      delivery_id: deliveryId,
      client_id: delivery.client_id,
      invoice_date,
      due_date,
      payment_terms: terms,
      subtotal,
      discount_amount: 0.00,
      tax_amount: 0.00,
      total_amount: subtotal,
      amount_paid: 0.00,
      balance: subtotal,
      status: 'Unpaid',
      created_by: req.user.id
    });

    for (const item of invoiceItemsData) {
      await trx('b2b_invoice_items').insert({
        invoice_id: invoiceId,
        ...item
      });
    }

    // Transactional Sub-ledger Debit Posting
    await postDebitToCustomerLedger({
      clientId: delivery.client_id,
      referenceNumber: invoice_number,
      referenceId: invoiceId,
      amount: subtotal,
      remarks: `Billing for ${so.so_number} / ${delivery.delivery_number}`,
      userId: req.user.id,
      ipAddress: req.ip,
      trx
    });

    // Update SO status
    await trx('b2b_sales_orders').where({ id: delivery.sales_order_id }).update({
      status: 'Invoiced',
      updated_at: trx.fn.now()
    });

    await logAudit({
      userId: req.user.id,
      action: 'GENERATE_INVOICE',
      entityType: 'b2b_invoices',
      entityId: invoiceId,
      newValues: { invoice_number, subtotal, total_amount: subtotal, client_id: delivery.client_id },
      reason: `Invoice generated from delivery ${delivery.delivery_number}`,
      ipAddress: req.ip,
      trx
    });

    await trx.commit();

    const created = await db('b2b_invoices').where({ id: invoiceId }).first();
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    await trx.rollback();
    next(err);
  }
};

exports.getInvoicePdf = async (req, res, next) => {
  try {
    const { id } = req.params;
    const invoice = await db('b2b_invoices')
      .join('b2b_sales_orders', 'b2b_invoices.sales_order_id', 'b2b_sales_orders.id')
      .join('b2b_clients', 'b2b_invoices.client_id', 'b2b_clients.id')
      .select('b2b_invoices.*', 'b2b_sales_orders.so_number', 'b2b_clients.company_name', 'b2b_clients.billing_address', 'b2b_clients.delivery_address', 'b2b_clients.tin_number', 'b2b_clients.phone', 'b2b_clients.email', 'b2b_clients.contact_person')
      .where('b2b_invoices.id', id)
      .first();

    if (!invoice) return res.status(404).send('Invoice not found');

    const items = await db('b2b_invoice_items')
      .join('b2b_products', 'b2b_invoice_items.product_id', 'b2b_products.id')
      .select('b2b_invoice_items.*', 'b2b_products.product_name', 'b2b_products.sku')
      .where('b2b_invoice_items.invoice_id', id);

    const html = generateDocumentHtml({
      title: 'Official Billing Invoice',
      docNumber: invoice.invoice_number,
      date: invoice.invoice_date,
      client: invoice,
      items,
      totals: {
        subtotal: invoice.subtotal,
        discount_amount: invoice.discount_amount,
        tax_amount: invoice.tax_amount,
        total_amount: invoice.total_amount
      }
    });

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    next(err);
  }
};
