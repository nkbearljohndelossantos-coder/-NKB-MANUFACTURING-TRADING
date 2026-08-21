/**
 * Professional HTML document templates for official printable vouchers & downloads
 */

function formatPeso(val) {
  const num = Number(val) || 0;
  return '₱' + num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function generateDocumentHtml({ title, docNumber, date, client, items, totals, meta = {} }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title} - ${docNumber}</title>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; margin: 0; padding: 24px; font-size: 13px; }
    .header { border-bottom: 2px solid #0f766e; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; }
    .company { font-size: 20px; font-weight: bold; color: #0f766e; }
    .company-sub { font-size: 11px; color: #64748b; }
    .doc-info { text-align: right; }
    .doc-title { font-size: 18px; font-weight: bold; color: #0f172a; text-transform: uppercase; }
    .doc-number { font-size: 14px; font-weight: bold; color: #0f766e; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
    .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; }
    .box-title { font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #0f766e; color: white; text-align: left; padding: 8px 10px; font-size: 12px; }
    td { border-bottom: 1px solid #e2e8f0; padding: 8px 10px; font-size: 12px; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .totals { width: 280px; margin-left: auto; margin-bottom: 24px; }
    .totals-row { display: flex; justify-content: space-between; padding: 4px 0; }
    .totals-row.grand { border-top: 2px solid #0f766e; font-size: 15px; font-weight: bold; color: #0f766e; padding-top: 8px; margin-top: 4px; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; background: #e0f2fe; color: #0369a1; }
    .badge-foc { background: #fef3c7; color: #b45309; }
    .footer { border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 30px; display: flex; justify-content: space-between; font-size: 11px; color: #64748b; }
    .sig-line { width: 180px; border-top: 1px solid #94a3b8; margin-top: 40px; text-align: center; padding-top: 4px; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company">NKB MANUFACTURING & TRADING CORP.</div>
      <div class="company-sub">B2B Cosmetics & Personal Care Solutions • Laguna Technopark, Philippines</div>
      <div class="company-sub">TIN: 009-887-654-000 • Tel: +63 (02) 8888-0000 • Email: sales@nkbmanufacturing.com</div>
    </div>
    <div class="doc-info">
      <div class="doc-title">${title}</div>
      <div class="doc-number">${docNumber}</div>
      <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Date: ${date}</div>
    </div>
  </div>

  <div class="grid">
    <div class="box">
      <div class="box-title">Client Information</div>
      <div style="font-weight: bold; font-size: 14px;">${client.company_name}</div>
      <div>Contact: ${client.contact_person || 'N/A'} • ${client.phone || ''}</div>
      <div>Email: ${client.email || ''}</div>
      <div>TIN: ${client.tin_number || 'N/A'}</div>
    </div>
    <div class="box">
      <div class="box-title">Addresses & Terms</div>
      <div><strong>Billing:</strong> ${client.billing_address || 'N/A'}</div>
      <div><strong>Delivery:</strong> ${client.delivery_address || 'N/A'}</div>
      <div><strong>Payment Terms:</strong> ${client.payment_terms || meta.payment_terms || '30 Days'}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item / Description</th>
        <th class="text-center">Ordered</th>
        <th class="text-center">Delivered</th>
        <th class="text-center">Billable</th>
        <th class="text-center">FOC</th>
        <th class="text-right">Unit Price</th>
        <th class="text-right">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${items.map(item => `
        <tr>
          <td>
            <strong>${item.product_name || item.sku}</strong>
            <div style="font-size: 10px; color: #64748b;">SKU: ${item.sku} ${item.batch_number ? '• Lot: ' + item.batch_number : ''}</div>
          </td>
          <td class="text-center">${Number(item.ordered_qty).toLocaleString()}</td>
          <td class="text-center">${Number(item.delivered_qty || 0).toLocaleString()}</td>
          <td class="text-center"><strong>${Number(item.billable_qty !== undefined ? item.billable_qty : item.ordered_qty).toLocaleString()}</strong></td>
          <td class="text-center">
            ${Number(item.foc_qty || 0) > 0 ? `<span class="badge badge-foc">${Number(item.foc_qty).toLocaleString()} FOC</span>` : '0'}
          </td>
          <td class="text-right">${formatPeso(item.unit_price)}</td>
          <td class="text-right"><strong>${formatPeso(item.subtotal)}</strong></td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row">
      <span>Subtotal:</span>
      <span>${formatPeso(totals.subtotal)}</span>
    </div>
    ${totals.discount_amount > 0 ? `
      <div class="totals-row" style="color: #b45309;">
        <span>Discount:</span>
        <span>-${formatPeso(totals.discount_amount)}</span>
      </div>
    ` : ''}
    ${totals.tax_amount > 0 ? `
      <div class="totals-row">
        <span>VAT / Tax:</span>
        <span>${formatPeso(totals.tax_amount)}</span>
      </div>
    ` : ''}
    <div class="totals-row grand">
      <span>Total Amount:</span>
      <span>${formatPeso(totals.total_amount || totals.subtotal)}</span>
    </div>
  </div>

  <div class="footer">
    <div>
      <div class="sig-line">Prepared By / Warehouse</div>
    </div>
    <div>
      <div class="sig-line">Approved By / Finance</div>
    </div>
    <div>
      <div class="sig-line">Received in Good Order (Client)</div>
    </div>
  </div>
</body>
</html>`;
}

module.exports = { generateDocumentHtml, formatPeso };
