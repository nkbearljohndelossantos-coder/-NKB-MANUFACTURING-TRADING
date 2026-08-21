const db = require('../config/db');
const { logAudit } = require('./auditService');

/**
 * Validates client credit limit before order submission/confirmation
 */
async function checkClientCredit(clientId, newOrderAmount, trx = null) {
  const executor = trx || db;
  const client = await executor('b2b_clients').where('id', clientId).first();
  if (!client) {
    throw new Error(`Client with ID ${clientId} not found.`);
  }

  const creditLimit = Number(client.credit_limit);
  const currentBalance = Number(client.current_balance);
  const projectedBalance = currentBalance + Number(newOrderAmount);
  const availableCredit = creditLimit - currentBalance;

  const isExceeded = creditLimit > 0 && projectedBalance > creditLimit;

  return {
    client,
    creditLimit,
    currentBalance,
    availableCredit,
    projectedBalance,
    isExceeded,
    action: client.credit_control_action || 'Require Approval'
  };
}

/**
 * Posts an immutable debit entry (e.g. Invoice issued)
 */
async function postDebitToCustomerLedger({
  clientId,
  referenceNumber,
  referenceId,
  amount,
  remarks,
  userId,
  ipAddress,
  trx
}) {
  const client = await trx('b2b_clients').where('id', clientId).forUpdate().first();
  const currentBalance = Number(client.current_balance);
  const newBalance = currentBalance + Number(amount);

  // Update client master balance
  await trx('b2b_clients').where('id', clientId).update({
    current_balance: newBalance,
    updated_at: trx.fn.now()
  });

  // Post to customer ledger
  const [ledgerId] = await trx('b2b_customer_ledger').insert({
    client_id: clientId,
    transaction_date: trx.fn.now(),
    transaction_type: 'Invoice',
    reference_number: referenceNumber,
    reference_id: referenceId,
    debit_amount: amount,
    credit_amount: 0.00,
    running_balance: newBalance,
    remarks: remarks || `Invoice ${referenceNumber} posted`,
    created_by: userId
  });

  await logAudit({
    userId,
    action: 'CUSTOMER_LEDGER_DEBIT',
    entityType: 'b2b_customer_ledger',
    entityId: ledgerId,
    oldValues: { balance: currentBalance },
    newValues: { balance: newBalance, debit: amount },
    reason: remarks,
    ipAddress,
    trx
  });

  return { ledgerId, newBalance };
}

/**
 * Posts an immutable credit entry (e.g. Payment collected)
 */
async function postCreditToCustomerLedger({
  clientId,
  referenceNumber,
  referenceId,
  amount,
  remarks,
  userId,
  ipAddress,
  trx
}) {
  const client = await trx('b2b_clients').where('id', clientId).forUpdate().first();
  const currentBalance = Number(client.current_balance);
  const newBalance = currentBalance - Number(amount);

  // Update client master balance
  await trx('b2b_clients').where('id', clientId).update({
    current_balance: newBalance,
    updated_at: trx.fn.now()
  });

  // Post to customer ledger
  const [ledgerId] = await trx('b2b_customer_ledger').insert({
    client_id: clientId,
    transaction_date: trx.fn.now(),
    transaction_type: 'Payment',
    reference_number: referenceNumber,
    reference_id: referenceId,
    debit_amount: 0.00,
    credit_amount: amount,
    running_balance: newBalance,
    remarks: remarks || `Payment ${referenceNumber} posted`,
    created_by: userId
  });

  await logAudit({
    userId,
    action: 'CUSTOMER_LEDGER_CREDIT',
    entityType: 'b2b_customer_ledger',
    entityId: ledgerId,
    oldValues: { balance: currentBalance },
    newValues: { balance: newBalance, credit: amount },
    reason: remarks,
    ipAddress,
    trx
  });

  return { ledgerId, newBalance };
}

module.exports = {
  checkClientCredit,
  postDebitToCustomerLedger,
  postCreditToCustomerLedger
};
