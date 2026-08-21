import React, { useState, useEffect } from 'react';
import api from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useToast } from '../context/ToastContext';
import { Plus, Search, FileText, Eye, Printer, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState('');

  const toast = useToast();

  const loadData = async () => {
    try {
      const [invRes, delRes] = await Promise.all([
        api.get(`/b2b/invoices?search=${search}`),
        api.get('/b2b/deliveries?status=Delivered')
      ]);
      if (invRes.success) setInvoices(invRes.data);
      if (delRes.success) setDeliveries(delRes.data);
    } catch (err) {
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search]);

  const handleGenerateInvoice = async (e) => {
    e.preventDefault();
    if (!selectedDeliveryId) return;
    try {
      const res = await api.post(`/b2b/invoices/generate-from-delivery/${selectedDeliveryId}`, {});
      if (res.success) {
        toast.success(`Invoice ${res.data.invoice_number} generated based on Billable Quantities`);
        setShowModal(false);
        loadData();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to generate invoice');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Billing & Tax Invoices</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Strict Accounting Rule: Invoices are calculated strictly from approved <strong>Billable Quantities</strong>
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Generate Invoice from DR</span>
        </button>
      </div>

      {/* Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="relative w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Invoice#, SO#, client..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-600"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Showing <strong>{invoices.length}</strong> invoices
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <th className="py-3.5 px-4">Invoice #</th>
              <th className="py-3.5 px-4">Invoice Date</th>
              <th className="py-3.5 px-4">Due Date</th>
              <th className="py-3.5 px-4">Client</th>
              <th className="py-3.5 px-4">SO Reference</th>
              <th className="py-3.5 px-4 text-right">Invoice Total</th>
              <th className="py-3.5 px-4 text-right">Amount Paid</th>
              <th className="py-3.5 px-4 text-right">Balance Due</th>
              <th className="py-3.5 px-4 text-center">Status</th>
              <th className="py-3.5 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan="10" className="py-8 text-center text-slate-400">No invoices recorded.</td>
              </tr>
            ) : (
              invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3.5 px-4 font-bold text-teal-800">
                    <Link to={`/invoices/${inv.id}`} className="hover:underline">
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 font-medium">{formatDate(inv.invoice_date)}</td>
                  <td className="py-3.5 px-4 text-slate-600 font-medium">{formatDate(inv.due_date)}</td>
                  <td className="py-3.5 px-4">
                    <strong className="text-slate-900 font-bold block">{inv.client_company_name}</strong>
                    <span className="text-[11px] text-slate-400">{inv.client_code}</span>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-700">{inv.so_number}</td>
                  <td className="py-3.5 px-4 text-right font-black text-slate-900">{formatCurrency(inv.total_amount)}</td>
                  <td className="py-3.5 px-4 text-right font-bold text-emerald-700">{formatCurrency(inv.amount_paid)}</td>
                  <td className="py-3.5 px-4 text-right">
                    <strong className={`font-black ${Number(inv.balance) > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                      {formatCurrency(inv.balance)}
                    </strong>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Link
                        to={`/invoices/${inv.id}`}
                        className="p-1.5 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 rounded-lg text-slate-600 font-bold transition"
                        title="View Invoice"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Generate Invoice Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Generate Invoice from Finalized Delivery">
        <form onSubmit={handleGenerateInvoice} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Select Delivery Receipt (DR) *</label>
            <select
              value={selectedDeliveryId}
              onChange={e => setSelectedDeliveryId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-teal-600"
              required
            >
              <option value="">Select Delivery</option>
              {deliveries.map(d => (
                <option key={d.id} value={d.id}>
                  {d.delivery_number} ({d.so_number} - {d.client_company_name})
                </option>
              ))}
            </select>
          </div>

          <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-900 font-medium">
            💡 The invoice will bill the <strong>Approved Billable Quantity</strong>. Any excess FOC quantities will appear on the invoice itemized as ₱0.00.
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold">Cancel</button>
            <button type="submit" className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-sm">Generate & Post Debit to Ledger</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
