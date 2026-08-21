const db = require('../config/db');

exports.getAuditLogs = async (req, res, next) => {
  try {
    const { action, module, entity_type, limit = 100 } = req.query;
    let query = db('b2b_audit_logs')
      .leftJoin('users', 'b2b_audit_logs.user_id', 'users.id')
      .select(
        'b2b_audit_logs.*',
        'users.username',
        'users.full_name',
        'users.role as user_role'
      );

    if (action) query = query.where('b2b_audit_logs.action', action);
    if (module) query = query.where('b2b_audit_logs.module', module);
    if (entity_type) query = query.where('b2b_audit_logs.entity_type', entity_type);

    const logs = await query.orderBy('b2b_audit_logs.id', 'desc').limit(Number(limit));
    res.json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
};
