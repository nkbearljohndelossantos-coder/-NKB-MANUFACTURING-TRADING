const db = require('../config/db');
const { logAudit } = require('../services/auditService');

exports.getClients = async (req, res, next) => {
  try {
    const { search, status } = req.query;
    let query = db('b2b_clients').select('*');

    if (req.user.role === 'CLIENT') {
      if (!req.user.client_id) {
        return res.json({ success: true, data: [] });
      }
      query = query.where('id', req.user.client_id);
    }

    if (search) {
      query = query.where(builder => {
        builder.where('company_name', 'like', `%${search}%`)
          .orWhere('client_code', 'like', `%${search}%`)
          .orWhere('contact_person', 'like', `%${search}%`);
      });
    }

    if (status) {
      query = query.where('credit_status', status);
    }

    const clients = await query.orderBy('company_name', 'asc');
    res.json({ success: true, data: clients });
  } catch (err) {
    next(err);
  }
};

exports.getClientById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const client = await db('b2b_clients').where({ id }).first();
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    const ledger = await db('b2b_customer_ledger')
      .where({ client_id: id })
      .orderBy('id', 'desc')
      .limit(50);

    const invoices = await db('b2b_invoices')
      .where({ client_id: id })
      .orderBy('id', 'desc');

    const orders = await db('b2b_sales_orders')
      .where({ client_id: id })
      .orderBy('id', 'desc');

    res.json({
      success: true,
      data: {
        ...client,
        available_credit: Number(client.credit_limit) - Number(client.current_balance),
        ledger,
        invoices,
        orders
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.createClient = async (req, res, next) => {
  try {
    const {
      client_code,
      company_name,
      tin_number,
      contact_person,
      email,
      phone,
      billing_address,
      delivery_address,
      credit_limit = 0,
      payment_terms = '30 Days',
      credit_control_action = 'Require Approval'
    } = req.body;

    if (!client_code || !company_name || !email || !billing_address || !delivery_address) {
      return res.status(400).json({ success: false, message: 'Missing required client fields' });
    }

    const [id] = await db('b2b_clients').insert({
      client_code,
      company_name,
      tin_number,
      contact_person,
      email,
      phone,
      billing_address,
      delivery_address,
      credit_limit,
      payment_terms,
      credit_status: 'Good',
      credit_control_action,
      current_balance: 0.00,
      is_active: 1
    });

    await logAudit({
      userId: req.user.id,
      action: 'CREATE_CLIENT',
      entityType: 'b2b_clients',
      entityId: id,
      newValues: { client_code, company_name, credit_limit },
      reason: 'New client registration',
      ipAddress: req.ip
    });

    const newClient = await db('b2b_clients').where({ id }).first();
    res.status(201).json({ success: true, data: newClient });
  } catch (err) {
    next(err);
  }
};

exports.updateClient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const oldClient = await db('b2b_clients').where({ id }).first();
    if (!oldClient) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    const {
      company_name,
      tin_number,
      contact_person,
      email,
      phone,
      billing_address,
      delivery_address,
      credit_limit,
      payment_terms,
      credit_status,
      credit_control_action,
      is_active
    } = req.body;

    await db('b2b_clients').where({ id }).update({
      company_name: company_name !== undefined ? company_name : oldClient.company_name,
      tin_number: tin_number !== undefined ? tin_number : oldClient.tin_number,
      contact_person: contact_person !== undefined ? contact_person : oldClient.contact_person,
      email: email !== undefined ? email : oldClient.email,
      phone: phone !== undefined ? phone : oldClient.phone,
      billing_address: billing_address !== undefined ? billing_address : oldClient.billing_address,
      delivery_address: delivery_address !== undefined ? delivery_address : oldClient.delivery_address,
      credit_limit: credit_limit !== undefined ? credit_limit : oldClient.credit_limit,
      payment_terms: payment_terms !== undefined ? payment_terms : oldClient.payment_terms,
      credit_status: credit_status !== undefined ? credit_status : oldClient.credit_status,
      credit_control_action: credit_control_action !== undefined ? credit_control_action : oldClient.credit_control_action,
      is_active: is_active !== undefined ? is_active : oldClient.is_active,
      updated_at: db.fn.now()
    });

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE_CLIENT',
      entityType: 'b2b_clients',
      entityId: id,
      oldValues: oldClient,
      newValues: req.body,
      reason: 'Client master update',
      ipAddress: req.ip
    });

    const updated = await db('b2b_clients').where({ id }).first();
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};
