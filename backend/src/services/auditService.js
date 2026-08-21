const db = require('../config/db');

/**
 * Append-only enterprise audit logger
 */
async function logAudit(options, trxParam = null) {
  const {
    userId = null,
    action,
    module = 'B2B_SALES',
    entityType,
    entityId,
    oldValues = null,
    newValues = null,
    reason = null,
    ipAddress = null,
    trx = null
  } = options || {};

  const executor = trx || trxParam || db;
  try {
    await executor('b2b_audit_logs').insert({
      user_id: userId,
      action: action,
      module: module,
      entity_type: entityType,
      entity_id: entityId,
      old_values: oldValues ? (typeof oldValues === 'string' ? oldValues : JSON.stringify(oldValues)) : null,
      new_values: newValues ? (typeof newValues === 'string' ? newValues : JSON.stringify(newValues)) : null,
      reason: reason,
      ip_address: ipAddress
    });
  } catch (err) {
    console.error('[AUDIT LOG ERROR] Failed to record audit log:', err.message);
  }
}

module.exports = { logAudit };
