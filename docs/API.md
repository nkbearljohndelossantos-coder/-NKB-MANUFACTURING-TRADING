# 🌐 B2B Manufacturing, Order, Delivery & Billing REST API Specification

**Base URL:** `https://clientpo.nkbmanufacturing.com/api` (or `http://localhost:5050/api`)  
**Authentication:** HTTP Bearer Token (`Authorization: Bearer <JWT_TOKEN>`)  

---

## 1. Authentication Endpoints
- `POST /api/auth/login`: Authenticates staff or client accounts.
- `GET /api/auth/me`: Returns profile and linked client profile.

---

## 2. Sales Orders (`/api/b2b/orders`)
- `GET /api/b2b/orders`: List sales orders (filtered by status, client, search).
- `GET /api/b2b/orders/:id`: 360° Order details with quantity separation matrix.
- `POST /api/b2b/orders`: Create order with credit check evaluation.
- `PUT /api/b2b/orders/:id/confirm`: Sales confirmation for production planning.

---

## 3. Manufacturing & Production Orders (`/api/b2b/production`)
- `GET /api/b2b/production/orders`: List production orders (filtered by status, batch, client, product).
- `GET /api/b2b/production/orders/:id`: Full 360° Production Order details with compounding outputs, variances, and dispositions.
- `POST /api/b2b/production/orders`: Create Production Order from confirmed Sales Order.
- `PUT /api/b2b/production/orders/:id/start`: Transition status to `IN_PRODUCTION`.
- `POST /api/b2b/production/orders/:id/record-output`: Record compounding/filling output event, increment Finished Goods inventory exactly once, compute compounding yield %, and auto-detect variances.
- `GET /api/b2b/production/variances`: Production Overruns and Shortages queue.
- `POST /api/b2b/production/variances/:id/disposition`: Assign excess output to `FOC`, `ADDITIONAL_SALE`, `FINISHED_GOODS_STOCK`, `REWORK`, or `SCRAP`.
- `POST /api/b2b/production/variances/:id/resolve-shortage`: Process shortage resolutions (`PARTIAL_DELIVERY_ACCEPTANCE`, `BACKORDER_REMAINDER`, `CANCEL_SHORTAGE`).

---

## 4. Warehouse Deliveries (`/api/b2b/deliveries`)
- `GET /api/b2b/deliveries`: List delivery receipts.
- `POST /api/b2b/deliveries`: Prepare delivery receipt.
- `POST /api/b2b/deliveries/:id/finalize`: Transactional inventory deduction (-delivered_qty) & root cause delivery variance check.
- `GET /api/b2b/deliveries/:id/pdf`: Official printable Delivery Receipt (DR).

---

## 5. Billing Invoices (`/api/b2b/invoices`)
- `GET /api/b2b/invoices`: Invoice registry.
- `POST /api/b2b/invoices/generate-from-delivery/:deliveryId`: Generates invoice strictly based on approved `billable_qty` & posts debit to AR ledger.
- `GET /api/b2b/invoices/:id/pdf`: Official Tax Invoice printable voucher.

---

## 6. Payments & Customer Ledger (`/api/b2b/payments` & `/api/b2b/ledger`)
- `GET /api/b2b/payments`: Payment collection registry.
- `POST /api/b2b/payments`: Records collection, settles invoice, posts credit to AR ledger.
- `GET /api/b2b/reports/receivables`: Real-time Statement of Account (SOA).

---

## 7. Reports & Audit Trail
- `GET /api/b2b/reports/dashboard`: KPI metrics, active batches, sales, AR aging.
- `GET /api/b2b/audit-logs`: Read-only, append-only security audit trail.
