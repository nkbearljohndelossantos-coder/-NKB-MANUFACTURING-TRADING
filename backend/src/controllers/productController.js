const db = require('../config/db');
const { logAudit } = require('../services/auditService');

exports.getProducts = async (req, res, next) => {
  try {
    const { search, category_id } = req.query;
    let query = db('b2b_products').select('*');

    if (search) {
      query = query.where(builder => {
        builder.where('product_name', 'like', `%${search}%`)
          .orWhere('sku', 'like', `%${search}%`);
      });
    }

    if (category_id) {
      query = query.where('category_id', category_id);
    }

    const products = await query.orderBy('product_name', 'asc');

    // Fetch batches for all products
    const batches = await db('b2b_product_batches').select('*');
    const enriched = products.map(p => ({
      ...p,
      batches: batches.filter(b => b.product_id === p.id)
    }));

    res.json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
};

exports.getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await db('b2b_products').where({ id }).first();
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const batches = await db('b2b_product_batches').where({ product_id: id });
    const transactions = await db('b2b_inventory_transactions')
      .where({ product_id: id })
      .orderBy('id', 'desc')
      .limit(50);

    res.json({
      success: true,
      data: {
        ...product,
        batches,
        transactions
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.createProduct = async (req, res, next) => {
  try {
    const {
      sku,
      product_name,
      description,
      category_id,
      category_name = 'Cosmetics',
      unit_of_measure = 'piece',
      unit_price = 0,
      cost_price = 0,
      current_stock = 0,
      minimum_stock = 10
    } = req.body;

    if (!sku || !product_name) {
      return res.status(400).json({ success: false, message: 'SKU and product name are required' });
    }

    const [id] = await db('b2b_products').insert({
      sku,
      product_name,
      description,
      category_id: category_id || null,
      category_name,
      unit_of_measure,
      unit_price,
      cost_price,
      current_stock,
      minimum_stock,
      is_active: 1
    });

    await logAudit({
      userId: req.user.id,
      action: 'CREATE_PRODUCT',
      entityType: 'b2b_products',
      entityId: id,
      newValues: { sku, product_name, unit_price, current_stock },
      reason: 'Product master creation',
      ipAddress: req.ip
    });

    const newProduct = await db('b2b_products').where({ id }).first();
    res.status(201).json({ success: true, data: newProduct });
  } catch (err) {
    next(err);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const oldProduct = await db('b2b_products').where({ id }).first();
    if (!oldProduct) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    await db('b2b_products').where({ id }).update({
      product_name: req.body.product_name || oldProduct.product_name,
      description: req.body.description !== undefined ? req.body.description : oldProduct.description,
      category_name: req.body.category_name || oldProduct.category_name,
      unit_of_measure: req.body.unit_of_measure || oldProduct.unit_of_measure,
      unit_price: req.body.unit_price !== undefined ? req.body.unit_price : oldProduct.unit_price,
      cost_price: req.body.cost_price !== undefined ? req.body.cost_price : oldProduct.cost_price,
      minimum_stock: req.body.minimum_stock !== undefined ? req.body.minimum_stock : oldProduct.minimum_stock,
      is_active: req.body.is_active !== undefined ? req.body.is_active : oldProduct.is_active,
      updated_at: db.fn.now()
    });

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE_PRODUCT',
      entityType: 'b2b_products',
      entityId: id,
      oldValues: oldProduct,
      newValues: req.body,
      reason: 'Product master update',
      ipAddress: req.ip
    });

    const updated = await db('b2b_products').where({ id }).first();
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

exports.addBatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { batch_number, manufacturing_date, expiration_date, quantity } = req.body;

    if (!batch_number || !quantity) {
      return res.status(400).json({ success: false, message: 'Batch number and quantity are required' });
    }

    const [batchId] = await db('b2b_product_batches').insert({
      product_id: id,
      batch_number,
      manufacturing_date: manufacturing_date || null,
      expiration_date: expiration_date || null,
      quantity_available: quantity
    });

    // Update product stock
    const product = await db('b2b_products').where({ id }).first();
    const newStock = Number(product.current_stock) + Number(quantity);
    await db('b2b_products').where({ id }).update({ current_stock: newStock, updated_at: db.fn.now() });

    // Inventory transaction
    await db('b2b_inventory_transactions').insert({
      product_id: id,
      batch_id: batchId,
      transaction_type: 'RESTOCK_IN',
      reference_type: 'BATCH_RECEIPT',
      reference_id: batchId,
      quantity: Number(quantity),
      previous_stock: product.current_stock,
      new_stock: newStock,
      remarks: `Batch ${batch_number} received into stock`,
      created_by: req.user.id
    });

    res.status(201).json({ success: true, message: 'Batch added successfully', batchId });
  } catch (err) {
    next(err);
  }
};

exports.getCategories = async (req, res, next) => {
  try {
    const categories = await db('b2b_categories').select('*').orderBy('name', 'asc');
    res.json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
};
