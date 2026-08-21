# 🌐 B2B Client Order, Delivery & Billing REST API Specification

**Base URL:** `https://clientpo.nkbmanufacturing.com/api` (or `http://localhost:5000/api`)  
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
- `PUT /api/b2b/orders/:id/confirm`: Sales confirmation for warehouse prep.
- `PUT /api/b2b/orders/:id/override-credit`: Manager credit limit override.
- `GET /api/b2b/orders/:id/pdf`: Official printable sales order voucher.

---

## 3. Warehouse Deliveries (`/api/b2b/deliveries`)
- `GET /api/b2b/deliveries`: List delivery receipts.
- `POST /api/b2b/deliveries`: Prepare delivery receipt.
- `POST /api/b2b/deliveries/:id/finalize`: Transactional inventory deduction (-delivered_qty) & variance check.
- `GET /api/b2b/deliveries/:id/pdf`: Official printable Delivery Receipt (DR).

---

## 4. Quantity Variances (`/api/b2b/variances`)
- `GET /api/b2b/variances`: Variance approval queue.
- `PUT /api/b2b/variances/:id/review`: Warehouse/sales tags reason & proposed action.
- `PUT /api/b2b/variances/:id/approve`: Manager locks billable_qty and foc_qty.
- `PUT /api/b2b/variances/:id/client-confirm`: Client portal variance confirmation.

---

## 5. Invoicing & Billing (`/api/b2b/invoices`)
- `GET /api/b2b/invoices`: Invoice registry.
- `POST /api/b2b/invoices/generate-from-delivery/:deliveryId`: Generates invoice based on billable_qty & posts debit to AR ledger.
- `GET /api/b2b/invoices/:id/pdf`: Official Tax Invoice printable voucher.

---

## 6. Payments & Collections (`/api/b2b/payments`)
- `GET /api/b2b/payments`: Payment collection registry.
- `POST /api/b2b/payments`: Records collection, settles invoice, posts credit to AR ledger.
- `GET /api/b2b/payments/:id/pdf`: Official Receipt (OR) printable voucher.

---

## 7. Reports & Audit Trail
- `GET /api/b2b/reports/dashboard`: KPI metrics and charts.
- `GET /api/b2b/reports/sales`: Sales volume report.
- `GET /api/b2b/reports/variances`: Over-delivery and FOC report.
- `GET /api/b2b/reports/receivables`: AR aging schedule.
- `GET /api/b2b/audit-logs`: Read-only security audit trail.
