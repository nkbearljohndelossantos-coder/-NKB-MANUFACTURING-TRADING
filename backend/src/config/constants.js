module.exports = {
  ROLES: {
    ADMIN: 'ADMIN',
    MANAGER: 'MANAGER',
    SALES: 'SALES',
    WAREHOUSE: 'WAREHOUSE',
    ACCOUNTING: 'ACCOUNTING',
    CLIENT: 'CLIENT'
  },
  ORDER_STATUS: {
    DRAFT: 'Draft',
    SUBMITTED: 'Submitted',
    CONFIRMED: 'Confirmed',
    IN_PREPARATION: 'In Preparation',
    READY_FOR_DELIVERY: 'Ready for Delivery',
    DELIVERED: 'Delivered',
    PARTIALLY_INVOICED: 'Partially Invoiced',
    INVOICED: 'Invoiced',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled'
  },
  DELIVERY_STATUS: {
    PREPARING: 'Preparing',
    DISPATCHED: 'Dispatched',
    DELIVERED: 'Delivered',
    VARIANCE_DETECTED: 'Variance Detected',
    COMPLETED: 'Completed'
  },
  VARIANCE_TYPE: {
    OVER_DELIVERY: 'Over-Delivery',
    UNDER_DELIVERY: 'Under-Delivery'
  },
  VARIANCE_REASONS: {
    FOC: 'Free / FOC',
    CLIENT_REQUEST: 'Client Requested Additional Quantity',
    OVERRUN: 'Production Overrun',
    REPLACEMENT: 'Replacement',
    SAMPLE: 'Sample',
    WAREHOUSE_ERROR: 'Warehouse Error',
    OTHER: 'Other'
  },
  TREATMENTS: {
    BILL_ORDERED: 'Bill Ordered Quantity',
    BILL_DELIVERED: 'Bill Delivered Quantity',
    PARTIAL_BILL: 'Partial Bill',
    FOC: 'FOC',
    PENDING_APPROVAL: 'Pending Approval'
  },
  INVOICE_STATUS: {
    UNPAID: 'Unpaid',
    PARTIALLY_PAID: 'Partially Paid',
    PAID: 'Paid',
    OVERDUE: 'Overdue',
    CANCELLED: 'Cancelled'
  },
  PAYMENT_METHODS: {
    CASH: 'Cash',
    BANK_TRANSFER: 'Bank Transfer',
    CHECK: 'Check',
    GCASH: 'GCash',
    OTHER: 'Other'
  },
  CREDIT_STATUS: {
    GOOD: 'Good',
    WARNING: 'Warning',
    BLOCKED: 'Blocked'
  },
  CREDIT_CONTROL_ACTIONS: {
    BLOCK: 'Block Order',
    REQUIRE_APPROVAL: 'Require Approval',
    ALLOW: 'Allow Order'
  }
};
