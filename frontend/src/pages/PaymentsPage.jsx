import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Modal from '../components/common/Modal';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useToast } from '../context/ToastContext';
import { Plus, Search, CreditCard, Eye, Printer, CheckCircle } from 'lucide-react';

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    invoice_id: '',
    payment_date: new Date().toISOString().split('T')[0],
    amount: 100000,
    payment_method: 'Bank Transfer',
    reference_number: '',
    bank_name: 'BDO Unibank',
    remarks: 'Payment settled in full'
  });

  const toast = useToast();

  const loadData = async () => {
    try {
      const [payRes, invRes] = await Promise.all([
        api.get(`/b2b/payments?search=${search}`),
        api.get('/b2b/invoices')
      ]);
      if (payRes.success) setPayments(payRes.data);
      if (invRes.success) setInvoices(invRes.data.filter(inv => Number(inv.balance) > 0));
    } catch (err) {
      toast.error('Failed to load payment records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search]);

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/b2b/payments', formData);
      if (res.success) {
        toast.success(`Payment ${res.data.payment_number} recorded. Balance updated to ${formatCurrency(res.remainingInvoiceBalance)}`);
        setShowModal(false);
        loadData();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to record payment');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Payments & Collections</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Record customer payments, auto-allocate to invoices, and post credits to AR ledger</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Record Collection (OR)</span>
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
            placeholder="Search OR#, Invoice#, client, ref..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-600"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Showing <strong>{payments.length}</strong> payment transactions
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <th className="py-3.5 px-4">OR / Payment #</th>
              <th className="py-3.5 px-4">Payment Date</th>
              <th className="py-3.5 px-4">Client</th>
              <th className="py-3.5 px-4">Invoice Ref</th>
              <th className="py-3.5 px-4">Payment Method</th>
              <th className="py-3.5 px-4">Bank / Reference</th>
              <th className="py-3.5 px-4 text-right">Amount Collected</th>
              <th className="py-3.5 px-4 text-center">Voucher</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payments.length === 0 ? (
              <tr>
                <td colSpan="8" className="py-8 text-center text-slate-400">No payment records found.</td>
              </tr>
            ) : (
              payments.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3.5 px-4 font-bold text-teal-800">{p.payment_number}</td>
                  <td className="py-3.5 px-4 text-slate-600 font-medium">{formatDate(p.payment_date)}</td>
                  <td className="py-3.5 px-4">
                    <strong className="text-slate-900 font-bold block">{p.client_company_name}</strong>
                    <span className="text-[11px] text-slate-400">{p.client_code}</span>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-700">{p.invoice_number}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">{p.payment_method}</td>
                  <td className="py-3.5 px-4 text-slate-600">
                    {p.bank_name || '—'} {p.reference_number ? `(${p.reference_number})` : ''}
                  </td>
                  <td className="py-3.5 px-4 text-right font-black text-emerald-700 text-sm">{formatCurrency(p.amount)}</td>
                  <td className="py-3.5 px-4 text-center">
                    <a
                      href={`/api/b2b/payments/${p.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 rounded-lg inline-flex text-slate-600 transition"
                      title="Print Official Receipt"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Record Payment Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Record Client Payment / Official Receipt (OR)">
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Select Unpaid Invoice *</label>
              <select
                value={formData.invoice_id}
                onChange={e => {
                  const inv = invoices.find(i => i.id === Number(e.target.value));
                  setFormData({
                    ...formData,
                    invoice_id: e.target.value,
                    amount: inv ? Number(inv.balance) : 0
                  });
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-teal-600"
                required
              >
                <option value="">Select Invoice</option>
                {invoices.map(i => (
                  <option key={i.id} value={i.id}>
                    {i.invoice_number} - {i.client_company_name} (Balance: ₱{Number(i.balance).toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Payment Date</label>
              <input
                type="date"
                value={formData.payment_date}
                onChange={e => setFormData({...formData, payment_date: e.target.value})}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-600"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Payment Amount (₱) *</label>
              <input
                type="number"
                value={formData.amount}
                onChange={e => setFormData({...formData, amount: Number(e.target.value)})}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-teal-600"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
              <select
                value={formData.payment_method}
                onChange={e => setFormData({...formData, payment_method: e.target.value})}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-teal-600"
              >
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
                <option value="Check">Check</option>
                <option value="GCash">GCash</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Bank Name</label>
              <input
                type="text"
                value={formData.bank_name}
                onChange={e => setFormData({...formData, bank_name: e.target.value})}
                placeholder="BDO, BPI, Metrobank..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Reference Number</label>
            <input
              type="text"
              value={formData.reference_number}
              onChange={e => setFormData({...formData, reference_number: e.target.value})}
              placeholder="e.g. Deposit Slip / Bank Ref #12345"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold">Cancel</button>
            <button type="submit" className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-sm">Post Payment & Update Ledger</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
