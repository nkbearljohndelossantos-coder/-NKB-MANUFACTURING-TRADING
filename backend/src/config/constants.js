module.exports = {
  ROLES: {
    ADMIN: 'ADMIN',
    MANAGER: 'MANAGER',
    SALES: 'SALES',
    PRODUCTION: 'PRODUCTION',
    WAREHOUSE: 'WAREHOUSE',
    ACCOUNTING: 'ACCOUNTING',
    CLIENT: 'CLIENT'
  },
  ORDER_STATUS: {
    DRAFT: 'Draft',
    SUBMITTED: 'Submitted',
    UNDER_REVIEW: 'Under Review',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    CANCELLED: 'Cancelled',
    FOR_PRODUCTION: 'For Production',
    IN_PRODUCTION: 'In Production',
    READY_FOR_DELIVERY: 'Ready for Delivery',
    PARTIALLY_DELIVERED: 'Partially Delivered',
    DELIVERED: 'Delivered',
    INVOICED: 'Invoiced',
    PARTIALLY_PAID: 'Partially Paid',
    PAID: 'Paid',
    COMPLETED: 'Completed'
  },
  PRODUCTION_STATUS: {
    PLANNED: 'PLANNED',
    RELEASED: 'RELEASED',
    IN_PRODUCTION: 'IN_PRODUCTION',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
    ON_HOLD: 'ON_HOLD'
  },
  PRODUCTION_VARIANCE_TYPE: {
    OVERPRODUCTION: 'OVERPRODUCTION',
    SHORT_PRODUCTION: 'SHORT_PRODUCTION'
  },
  PRODUCTION_VARIANCE_REASONS: {
    COMPOUNDING_YIELD: 'Compounding Yield',
    PRODUCTION_OVERRUN: 'Production Overrun',
    BATCH_REQUIREMENT: 'Batch Requirement',
    FILLING_VARIANCE: 'Filling Line Variance',
    PACKAGING_VARIANCE: 'Packaging Variance',
    PROCESS_LOSS: 'Process Loss',
    RAW_MATERIAL_DEFECT: 'Raw Material Defect',
    REPLACEMENT: 'Replacement',
    OTHER: 'Other'
  },
  DISPOSITION_TYPES: {
    FOC: 'FOC',
    ADDITIONAL_SALE: 'ADDITIONAL_SALE',
    FINISHED_GOODS_STOCK: 'FINISHED_GOODS_STOCK',
    REWORK: 'REWORK',
    SCRAP: 'SCRAP',
    OTHER: 'OTHER'
  },
  SHORTAGE_RESOLUTION_TYPES: {
    PARTIAL_DELIVERY_ACCEPTANCE: 'Partial Delivery Acceptance',
    BACKORDER_REMAINDER: 'Backorder Remainder',
    CANCEL_SHORTAGE: 'Cancel Shortage',
    SCRAP_SHORTAGE: 'Scrap Shortage'
  },
  DELIVERY_VARIANCE_SOURCES: {
    PRODUCTION_OVERRUN: 'Production Overrun',
    WAREHOUSE_DISPATCH_VARIANCE: 'Warehouse Dispatch Variance',
    SAMPLE_ADDITION: 'Sample Addition',
    CLIENT_ADDITIONAL_REQUEST: 'Client Additional Request'
  },
  DELIVERY_STATUS: {
    PREPARING: 'Preparing',
    DISPATCHED: 'Dispatched',
    DELIVERED: 'Delivered',
    VARIANCE_DETECTED: 'Variance Detected',
    COMPLETED: 'Completed'
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
