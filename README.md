# 🏛️ B2B Client Order, Delivery, Variance, Billing & Payment Management System

A production-ready, full-stack B2B enterprise web application engineered for cosmetics manufacturing and trading operations. Integrates seamlessly into the NKB Enterprise ERP suite alongside Purchase Requisition, Petty Cash, Formulation Pro, and IT Management modules.

---

## 🌟 Key Business Features

1. **Strict Quantity Separation Engine**:
   - `ordered_qty`: Client's original agreed order volume.
   - `delivered_qty`: Physical count dispatched from the warehouse.
   - `variance_qty`: `delivered_qty - ordered_qty`.
   - `billable_qty`: Quantity authorized for invoicing.
   - `foc_qty`: Free-Of-Charge items (promotional bonuses, production overruns).
   - `invoiced_qty`: Quantity billed on official tax invoice.
2. **Physical Inventory vs. Financial Separation**:
   - **Warehouse Inventory Deduction** = Strictly actual physical `delivered_qty` (`-1,100`).
   - **Invoice Billing Calculation** = Strictly approved `billable_qty` (`1,000 × ₱100 = ₱100,000`).
3. **Automated Over-Delivery Governance & Approval Workflow**:
   - Automatic detection of excess quantities dispatched.
   - Tagged reasons: `Production Overrun`, `Free / FOC`, `Replacement`, `Client Requested Additional Qty`, `Sample`, `Warehouse Error`.
   - Manager approval requirement before final invoice generation.
4. **Client Credit Management**:
   - Credit limits, available credit tracking, payment terms, and configurable actions (`Block Order`, `Require Approval`, `Allow Order`).
5. **Customer Accounts Receivable Ledger**:
   - Immutable double-entry sub-ledger tracking Debits (Invoices), Credits (Payments), and real-time Statement of Account (SOA).
6. **Role-Based Portals & Access Control (RBAC)**:
   - Dedicated portals for `ADMIN`, `MANAGER`, `SALES`, `WAREHOUSE`, `ACCOUNTING`, and `CLIENT`.
7. **Official Voucher & PDF Generation Suite**:
   - 1-Page A4 printable templates for Sales Orders, Delivery Receipts (DR), Billing Invoices, Official Receipts (OR), and Statements of Account (SOA).
8. **Enterprise Audit Trail**:
   - Append-only, tamper-proof audit trail capturing before/after JSON diffs, user ID, timestamp, and IP address.

---

## 🧪 Critical Business Test Scenario

This system is mathematically validated against the critical cosmetics manufacturing scenario:
```text
1. Client orders 1,000 bottles of Lotion @ ₱100 (Total ₱100,000).
2. Warehouse delivers 1,100 bottles (+100 Over-Delivery).
3. Physical warehouse inventory is deducted by -1,100 units.
4. System automatically flags "OVER-DELIVERY DETECTED" and creates a Variance Request.
5. Manager reviews and approves: Reason = Production Overrun, Treatment = 100 FOC.
6. Billable Quantity is locked at 1,000 units (FOC = 100 units).
7. Invoice is generated strictly for 1,000 units × ₱100 = ₱100,000.
8. Customer AR Ledger is debited ₱100,000.
9. Payment of ₱100,000 is recorded via Bank Transfer.
10. Customer AR balance settles to ₱0.00 and order transitions to Completed.
```

---

## 🚀 Quick Start & Local Development

### 1. Install Dependencies
```bash
# Backend dependencies
cd backend && npm install

# Frontend dependencies
cd ../frontend && npm install
```

### 2. Run Automated Integration Tests
```bash
cd backend && npm test
```

### 3. Start Development Servers
```bash
# Start Backend (Port 5000)
cd backend && npm run dev

# Start Frontend (Port 3000)
cd frontend && npm run dev
```

---

## 🔐 Default Demo Accounts (Quick Fill Available on Login)

| Role | Username | Password | Purpose |
|---|---|---|---|
| **System Admin** | `admin` | `admin123` | Full system governance, audit logs, user management |
| **Operations Manager** | `manager` | `admin123` | Approves over-deliveries, FOC quantities, credit overrides |
| **Senior Sales** | `sales` | `admin123` | Creates clients, creates & confirms sales orders |
| **Warehouse Supervisor** | `warehouse` | `admin123` | Prepares dispatches, enters delivered quantities, batches |
| **Chief Accountant** | `accounting` | `admin123` | Generates invoices, records payments, views AR aging |
| **Corporate Client** | `client_abc` | `admin123` | Client portal: orders, deliveries, variance confirms, SOA |

---

## 📖 Documentation Suite

- [Database Architecture & ERD](docs/DATABASE.md)
- [REST API Specification](docs/API.md)
- [Hostinger Production Deployment Guide](docs/DEPLOYMENT.md)
