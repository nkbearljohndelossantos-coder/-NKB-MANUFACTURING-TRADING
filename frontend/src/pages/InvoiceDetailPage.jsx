import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useToast } from '../context/ToastContext';
import { ArrowLeft, Printer, CreditCard } from 'lucide-react';

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const loadInvoice = async () => {
    try {
      const res = await api.get(`/b2b/invoices/${id}`);
      if (res.success) setInvoice(res.data);
    } catch (err) {
      toast.error('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoice();
  }, [id]);

  if (loading) return <div className="p-8 text-center text-slate-400">Loading invoice...</div>;
  if (!invoice) return <div className="p-8 text-center text-rose-500 font-bold">Invoice not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/invoices" className="p-2 bg-white rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">{invoice.invoice_number}</h2>
              <StatusBadge status={invoice.status} />
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">SO: {invoice.so_number} • Issued on {formatDate(invoice.invoice_date)} • Due {formatDate(invoice.due_date)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={`/api/b2b/invoices/${invoice.id}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Print Official Invoice</span>
          </a>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2 text-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Billed Client</span>
          <strong className="text-sm font-black text-slate-900 block">{invoice.company_name}</strong>
          <p className="text-slate-600">Billing Address: {invoice.billing_address}</p>
          <p className="text-slate-600">TIN: {invoice.tin_number || 'N/A'}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2 text-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Payment & Terms</span>
          <p className="text-slate-700"><strong>Payment Terms:</strong> {invoice.payment_terms}</p>
          <p className="text-slate-700"><strong>Due Date:</strong> {formatDate(invoice.due_date)}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2 text-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Billing Balance</span>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500">Invoice Total:</span>
            <strong className="text-slate-900">{formatCurrency(invoice.total_amount)}</strong>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500">Amount Paid:</span>
            <strong className="text-emerald-700">{formatCurrency(invoice.amount_paid)}</strong>
          </div>
          <div className="flex justify-between pt-1">
            <span className="font-bold text-slate-700">Balance Due:</span>
            <strong className="font-black text-rose-600 text-sm">{formatCurrency(invoice.balance)}</strong>
          </div>
        </div>
      </div>

      {/* Invoice Items */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
            Billed Items (Billable Quantity Applied)
          </h3>
        </div>
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <th className="py-3 px-4">Item Formulation</th>
              <th className="py-3 px-4 text-center">Delivered Qty</th>
              <th className="py-3 px-4 text-center">Billable Qty</th>
              <th className="py-3 px-4 text-center">FOC Qty</th>
              <th className="py-3 px-4 text-right">Unit Price</th>
              <th className="py-3 px-4 text-right">Line Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(invoice.items || []).map(item => (
              <tr key={item.id} className="hover:bg-slate-50/60 transition">
                <td className="py-3.5 px-4 font-bold text-slate-900">
                  {item.product_name}
                  <span className="text-[11px] text-slate-400 block font-normal">SKU: {item.sku}</span>
                </td>
                <td className="py-3.5 px-4 text-center font-semibold text-slate-700">{Number(item.delivered_qty).toLocaleString()}</td>
                <td className="py-3.5 px-4 text-center font-black text-teal-800 text-sm">{Number(item.billable_qty).toLocaleString()}</td>
                <td className="py-3.5 px-4 text-center">
                  {Number(item.foc_qty) > 0 ? (
                    <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-black text-[11px]">
                      {Number(item.foc_qty).toLocaleString()} FOC (₱0.00)
                    </span>
                  ) : (
                    '0'
                  )}
                </td>
                <td className="py-3.5 px-4 text-right text-slate-700 font-semibold">{formatCurrency(item.unit_price)}</td>
                <td className="py-3.5 px-4 text-right font-black text-slate-900">{formatCurrency(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
