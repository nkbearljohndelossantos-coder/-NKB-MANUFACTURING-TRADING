const db = require('../config/db');
const productionService = require('../services/productionService');
const { generateSOAPDF } = require('../services/pdfService');

exports.getProductionOrders = async (req, res, next) => {
  try {
    const { status, client_id, search } = req.query;
    let query = db('b2b_production_orders as po')
      .leftJoin('b2b_sales_orders as so', 'po.sales_order_id', 'so.id')
      .leftJoin('b2b_clients as c', 'po.client_id', 'c.id')
      .leftJoin('b2b_products as p', 'po.product_id', 'p.id')
      .select(
        'po.*',
        'so.so_number',
        'c.company_name as client_name',
        'p.product_name',
        'p.sku'
      )
      .orderBy('po.id', 'desc');

    if (req.user.role === 'CLIENT') {
      query = query.where('po.client_id', req.user.client_id || 0);
    } else if (client_id) {
      query = query.where('po.client_id', client_id);
    }

    if (status) {
      query = query.where('po.production_status', status);
    }

    if (search) {
      query = query.where(b => {
        b.where('po.production_order_number', 'like', `%${search}%`)
          .orWhere('po.batch_number', 'like', `%${search}%`)
          .orWhere('p.product_name', 'like', `%${search}%`)
          .orWhere('c.company_name', 'like', `%${search}%`);
      });
    }

    const orders = await query;
    res.json({ success: true, data: orders });
  } catch (err) {
    next(err);
  }
};

exports.getProductionOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const po = await db('b2b_production_orders as po')
      .leftJoin('b2b_sales_orders as so', 'po.sales_order_id', 'so.id')
      .leftJoin('b2b_clients as c', 'po.client_id', 'c.id')
      .leftJoin('b2b_products as p', 'po.product_id', 'p.id')
      .leftJoin('b2b_product_batches as pb', 'po.batch_id', 'pb.id')
      .select(
        'po.*',
        'so.so_number',
        'c.company_name as client_name',
        'p.product_name',
        'p.sku',
        'pb.quantity_available as batch_stock'
      )
      .where('po.id', id)
      .first();

    if (!po) return res.status(404).json({ success: false, message: 'Production Order not found' });

    if (req.user.role === 'CLIENT' && po.client_id !== req.user.client_id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const outputs = await db('b2b_production_outputs').where('production_order_id', id).orderBy('id', 'asc');
    const variances = await db('b2b_production_variances').where('production_order_id', id);
    const dispositions = await db('b2b_production_dispositions').where('production_order_id', id);
    const shortages = await db('b2b_production_shortages').where('production_order_id', id);

    res.json({
      success: true,
      data: {
        ...po,
        outputs,
        variances,
        dispositions,
        shortages
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.createProductionOrder = async (req, res, next) => {
  try {
    const result = await productionService.createProductionOrder({
      ...req.body,
      userId: req.user.id,
      req
    });
    res.status(201).json({ success: true, message: 'Production Order created', data: result });
  } catch (err) {
    next(err);
  }
};

exports.startProduction = async (req, res, next) => {
  try {
    const result = await productionService.startProductionOrder(req.params.id, req.user.id, req);
    res.json({ success: true, message: 'Production started', data: result });
  } catch (err) {
    next(err);
  }
};

exports.recordOutput = async (req, res, next) => {
  try {
    const result = await productionService.recordProductionOutput({
      poId: req.params.id,
      ...req.body,
      userId: req.user.id,
      req
    });
    res.json({ success: true, message: 'Production output recorded and inventory posted', data: result });
  } catch (err) {
    next(err);
  }
};

exports.getVariances = async (req, res, next) => {
  try {
    const { status, type } = req.query;
    let query = db('b2b_production_variances as pv')
      .leftJoin('b2b_production_orders as po', 'pv.production_order_id', 'po.id')
      .leftJoin('b2b_products as p', 'pv.product_id', 'p.id')
      .leftJoin('b2b_clients as c', 'po.client_id', 'c.id')
      .select(
        'pv.*',
        'po.production_order_number',
        'po.batch_number',
        'p.product_name',
        'c.company_name as client_name'
      )
      .orderBy('pv.id', 'desc');

    if (req.user.role === 'CLIENT') {
      query = query.where('po.client_id', req.user.client_id || 0);
    }
    if (status) query = query.where('pv.status', status);
    if (type) query = query.where('pv.variance_type', type);

    const variances = await query;
    res.json({ success: true, data: variances });
  } catch (err) {
    next(err);
  }
};

exports.assignDisposition = async (req, res, next) => {
  try {
    const result = await productionService.assignExcessDisposition({
      pvId: req.params.id,
      dispositions: req.body.dispositions,
      userId: req.user.id,
      req
    });
    res.json({ success: true, message: 'Excess disposition approved', data: result });
  } catch (err) {
    next(err);
  }
};

exports.resolveShortage = async (req, res, next) => {
  try {
    const result = await productionService.resolveShortage({
      pvId: req.params.id,
      ...req.body,
      userId: req.user.id,
      req
    });
    res.json({ success: true, message: 'Shortage resolution processed', data: result });
  } catch (err) {
    next(err);
  }
};
