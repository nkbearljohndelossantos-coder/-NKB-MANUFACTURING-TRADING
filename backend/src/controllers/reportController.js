const db = require('../config/db');

exports.getDashboardStats = async (req, res, next) => {
  try {
    const isClient = req.user.role === 'CLIENT';
    const clientId = req.user.client_id;

    let ordersQuery = db('b2b_sales_orders');
    let deliveriesQuery = db('b2b_deliveries');
    let variancesQuery = db('b2b_quantity_variances');
    let invoicesQuery = db('b2b_invoices');
    let paymentsQuery = db('b2b_payments');

    if (isClient && clientId) {
      ordersQuery = ordersQuery.where({ client_id: clientId });
      deliveriesQuery = deliveriesQuery.where({ client_id: clientId });
      invoicesQuery = invoicesQuery.where({ client_id: clientId });
      paymentsQuery = paymentsQuery.where({ client_id: clientId });
      variancesQuery = variancesQuery
        .join('b2b_deliveries', 'b2b_quantity_variances.delivery_id', 'b2b_deliveries.id')
        .where('b2b_deliveries.client_id', clientId);
    }

    const totalOrdersCount = await ordersQuery.clone().count('id as count').first();
    const pendingOrdersCount = await ordersQuery.clone().whereIn('status', ['Draft', 'Submitted']).count('id as count').first();
    const readyForDeliveryCount = await ordersQuery.clone().where('status', 'Confirmed').count('id as count').first();
    const deliveredOrdersCount = await ordersQuery.clone().whereIn('status', ['Delivered', 'Invoiced', 'Completed']).count('id as count').first();

    const pendingVariancesCount = await variancesQuery.clone().where('approval_status', 'Pending Approval').count('b2b_quantity_variances.id as count').first();

    const totalInvoicedSum = await invoicesQuery.clone().sum('total_amount as total').first();
    const totalCollectedSum = await paymentsQuery.clone().sum('amount as total').first();
    const outstandingReceivablesSum = await invoicesQuery.clone().whereIn('status', ['Unpaid', 'Partially Paid', 'Overdue']).sum('balance as total').first();

    // Sales by month
    const monthlySales = await db('b2b_sales_orders')
      .select(db.raw("strftime('%Y-%m', order_date) as month, SUM(total_amount) as total_sales, COUNT(id) as order_count"))
      .groupByRaw("strftime('%Y-%m', order_date)")
      .orderBy('month', 'desc')
      .limit(6);

    // Top products
    const topProducts = await db('b2b_sales_order_items')
      .join('b2b_products', 'b2b_sales_order_items.product_id', 'b2b_products.id')
      .select('b2b_products.product_name', 'b2b_products.sku', db.raw('SUM(b2b_sales_order_items.ordered_qty) as total_qty, SUM(b2b_sales_order_items.subtotal) as total_value'))
      .groupBy('b2b_products.id')
      .orderBy('total_value', 'desc')
      .limit(5);

    res.json({
      success: true,
      data: {
        kpis: {
          totalOrders: Number(totalOrdersCount.count) || 0,
          pendingOrders: Number(pendingOrdersCount.count) || 0,
          readyForDelivery: Number(readyForDeliveryCount.count) || 0,
          deliveredOrders: Number(deliveredOrdersCount.count) || 0,
          pendingVariances: Number(pendingVariancesCount.count) || 0,
          totalInvoiced: Number(totalInvoicedSum.total) || 0,
          totalCollected: Number(totalCollectedSum.total) || 0,
          outstandingReceivables: Number(outstandingReceivablesSum.total) || 0
        },
        monthlySales: monthlySales.reverse(),
        topProducts
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.getSalesReport = async (req, res, next) => {
  try {
    const { startDate, endDate, client_id } = req.query;
    let query = db('b2b_sales_orders')
      .join('b2b_clients', 'b2b_sales_orders.client_id', 'b2b_clients.id')
      .select(
        'b2b_sales_orders.so_number',
        'b2b_sales_orders.order_date',
        'b2b_clients.company_name',
        'b2b_sales_orders.total_amount',
        'b2b_sales_orders.status'
      );

    if (startDate) query = query.where('b2b_sales_orders.order_date', '>=', startDate);
    if (endDate) query = query.where('b2b_sales_orders.order_date', '<=', endDate);
    if (client_id) query = query.where('b2b_sales_orders.client_id', client_id);

    const data = await query.orderBy('b2b_sales_orders.order_date', 'desc');
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.getVarianceReport = async (req, res, next) => {
  try {
    const data = await db('b2b_quantity_variances')
      .join('b2b_deliveries', 'b2b_quantity_variances.delivery_id', 'b2b_deliveries.id')
      .join('b2b_sales_orders', 'b2b_quantity_variances.sales_order_id', 'b2b_sales_orders.id')
      .join('b2b_clients', 'b2b_deliveries.client_id', 'b2b_clients.id')
      .join('b2b_products', 'b2b_quantity_variances.product_id', 'b2b_products.id')
      .select(
        'b2b_deliveries.delivery_number',
        'b2b_sales_orders.so_number',
        'b2b_clients.company_name',
        'b2b_products.product_name',
        'b2b_quantity_variances.ordered_qty',
        'b2b_quantity_variances.delivered_qty',
        'b2b_quantity_variances.variance_qty',
        'b2b_quantity_variances.variance_type',
        'b2b_quantity_variances.reason',
        'b2b_quantity_variances.proposed_treatment',
        'b2b_quantity_variances.billable_qty',
        'b2b_quantity_variances.foc_qty',
        'b2b_quantity_variances.approval_status'
      )
      .orderBy('b2b_quantity_variances.id', 'desc');

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.getReceivablesAgingReport = async (req, res, next) => {
  try {
    const clients = await db('b2b_clients')
      .where('current_balance', '>', 0)
      .select('id', 'client_code', 'company_name', 'credit_limit', 'payment_terms', 'current_balance')
      .orderBy('current_balance', 'desc');

    const invoices = await db('b2b_invoices')
      .whereIn('status', ['Unpaid', 'Partially Paid', 'Overdue'])
      .select('id', 'client_id', 'invoice_number', 'invoice_date', 'due_date', 'total_amount', 'balance');

    const today = new Date();
    const enrichedClients = clients.map(c => {
      const clientInvoices = invoices.filter(inv => inv.client_id === c.id);
      let current = 0;
      let d1_30 = 0;
      let d31_60 = 0;
      let d61_90 = 0;
      let d90_plus = 0;

      for (const inv of clientInvoices) {
        const dueDate = new Date(inv.due_date);
        const diffDays = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
        const bal = Number(inv.balance);

        if (diffDays <= 0) current += bal;
        else if (diffDays <= 30) d1_30 += bal;
        else if (diffDays <= 60) d31_60 += bal;
        else if (diffDays <= 90) d61_90 += bal;
        else d90_plus += bal;
      }

      return {
        ...c,
        current,
        d1_30,
        d31_60,
        d61_90,
        d90_plus,
        total_overdue: d1_30 + d31_60 + d61_90 + d90_plus
      };
    });

    res.json({ success: true, data: enrichedClients });
  } catch (err) {
    next(err);
  }
};
