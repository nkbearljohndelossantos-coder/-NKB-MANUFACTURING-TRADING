const db = require('../config/db');
const { postCreditToCustomerLedger } = require('../services/ledgerService');
const { logAudit } = require('../services/auditService');
const { generateDocumentHtml } = require('../services/pdfService');

exports.getPayments = async (req, res, next) => {
  try {
    const { client_id, invoice_id, search } = req.query;
    let query = db('b2b_payments')
      .join('b2b_invoices', 'b2b_payments.invoice_id', 'b2b_invoices.id')
      .join('b2b_clients', 'b2b_payments.client_id', 'b2b_clients.id')
      .select(
        'b2b_payments.*',
        'b2b_invoices.invoice_number',
        'b2b_clients.company_name as client_company_name',
        'b2b_clients.client_code'
      );

    if (req.user.role === 'CLIENT') {
      query = query.where('b2b_payments.client_id', req.user.client_id);
    } else if (client_id) {
      query = query.where('b2b_payments.client_id', client_id);
    }

    if (invoice_id) {
      query = query.where('b2b_payments.invoice_id', invoice_id);
    }

    if (search) {
      query = query.where(builder => {
        builder.where('b2b_payments.payment_number', 'like', `%${search}%`)
          .orWhere('b2b_invoices.invoice_number', 'like', `%${search}%`)
          .orWhere('b2b_payments.reference_number', 'like', `%${search}%`)
          .orWhere('b2b_clients.company_name', 'like', `%${search}%`);
      });
    }

    const payments = await query.orderBy('b2b_payments.id', 'desc');
    res.json({ success: true, data: payments });
  } catch (err) {
    next(err);
  }
};

exports.recordPayment = async (req, res, next) => {
  const trx = await db.transaction();
  try {
    const {
      invoice_id,
      payment_date = new Date().toISOString().split('T')[0],
      amount,
      payment_method = 'Bank Transfer',
      reference_number,
      bank_name,
      remarks
    } = req.body;

    const payAmount = Number(amount);
    if (!payAmount || payAmount <= 0) {
      await trx.rollback();
      return res.status(400).json({ success: false, message: 'Payment amount must be greater than 0' });
    }

    const invoice = await trx('b2b_invoices').where({ id: invoice_id }).forUpdate().first();
    if (!invoice) {
      await trx.rollback();
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const currentBalance = Number(invoice.balance);
    if (payAmount > currentBalance) {
      await trx.rollback();
      return res.status(400).json({
        success: false,
        message: `Payment amount (₱${payAmount.toLocaleString()}) exceeds invoice balance (₱${currentBalance.toLocaleString()})`
      });
    }

    const newAmountPaid = Number(invoice.amount_paid) + payAmount;
    const newInvoiceBalance = currentBalance - payAmount;
    const newStatus = newInvoiceBalance === 0 ? 'Paid' : 'Partially Paid';

    // Generate Payment/Receipt Number
    const countResult = await trx('b2b_payments').count('id as count').first();
    const count = (Number(countResult.count) || 0) + 1;
    const year = new Date().getFullYear();
    const payment_number = `OR-${year}-${String(count).padStart(4, '0')}`;

    const [paymentId] = await trx('b2b_payments').insert({
      payment_number,
      client_id: invoice.client_id,
      invoice_id,
      payment_date,
      amount: payAmount,
      payment_method,
      reference_number: reference_number || null,
      bank_name: bank_name || null,
      remarks: remarks || null,
      recorded_by: req.user.id
    });

    // Update invoice balance & status
    await trx('b2b_invoices').where({ id: invoice_id }).update({
      amount_paid: newAmountPaid,
      balance: newInvoiceBalance,
      status: newStatus,
      updated_at: trx.fn.now()
    });

    // Post to Customer Ledger
    await postCreditToCustomerLedger({
      clientId: invoice.client_id,
      referenceNumber: payment_number,
      referenceId: paymentId,
      amount: payAmount,
      remarks: `Payment received for ${invoice.invoice_number} (${payment_method})`,
      userId: req.user.id,
      ipAddress: req.ip,
      trx
    });

    // If all invoices for the Sales Order are paid, complete the SO
    const unpaidInvoices = await trx('b2b_invoices')
      .where({ sales_order_id: invoice.sales_order_id })
      .whereNot({ status: 'Paid' })
      .count('id as count')
      .first();

    if (Number(unpaidInvoices.count) === 0) {
      await trx('b2b_sales_orders').where({ id: invoice.sales_order_id }).update({
        status: 'Completed',
        updated_at: trx.fn.now()
      });
    }

    await logAudit({
      userId: req.user.id,
      action: 'RECORD_PAYMENT',
      entityType: 'b2b_payments',
      entityId: paymentId,
      newValues: { payment_number, amount: payAmount, invoice_id, invoice_balance: newInvoiceBalance },
      reason: `Collection recorded against ${invoice.invoice_number}`,
      ipAddress: req.ip,
      trx
    });

    await trx.commit();

    const created = await db('b2b_payments').where({ id: paymentId }).first();
    res.status(201).json({
      success: true,
      data: created,
      invoiceStatus: newStatus,
      remainingInvoiceBalance: newInvoiceBalance
    });
  } catch (err) {
    await trx.rollback();
    next(err);
  }
};

exports.getPaymentPdf = async (req, res, next) => {
  try {
    const { id } = req.params;
    const payment = await db('b2b_payments')
      .join('b2b_invoices', 'b2b_payments.invoice_id', 'b2b_invoices.id')
      .join('b2b_clients', 'b2b_payments.client_id', 'b2b_clients.id')
      .select('b2b_payments.*', 'b2b_invoices.invoice_number', 'b2b_clients.company_name', 'b2b_clients.billing_address', 'b2b_clients.tin_number', 'b2b_clients.phone', 'b2b_clients.email', 'b2b_clients.contact_person')
      .where('b2b_payments.id', id)
      .first();

    if (!payment) return res.status(404).send('Payment record not found');

    const html = generateDocumentHtml({
      title: 'Official Payment Receipt (OR)',
      docNumber: payment.payment_number,
      date: payment.payment_date,
      client: payment,
      items: [
        {
          product_name: `Payment for Invoice #${payment.invoice_number}`,
          sku: payment.payment_method,
          ordered_qty: 1,
          delivered_qty: 1,
          billable_qty: 1,
          foc_qty: 0,
          unit_price: payment.amount,
          subtotal: payment.amount
        }
      ],
      totals: {
        subtotal: payment.amount,
        discount_amount: 0,
        tax_amount: 0,
        total_amount: payment.amount
      }
    });

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    next(err);
  }
};
