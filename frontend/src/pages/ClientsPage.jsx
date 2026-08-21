import React, { useState, useEffect } from 'react';
import api from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useToast } from '../context/ToastContext';
import { Plus, Search, Building2, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    client_code: '',
    company_name: '',
    tin_number: '',
    contact_person: '',
    email: '',
    phone: '',
    billing_address: '',
    delivery_address: '',
    credit_limit: 500000,
    payment_terms: '30 Days',
    credit_control_action: 'Require Approval'
  });
  const toast = useToast();

  const loadClients = async () => {
    try {
      const res = await api.get(`/b2b/clients?search=${search}`);
      if (res.success) setClients(res.data);
    } catch (err) {
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, [search]);

  const handleCreateClient = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/b2b/clients', formData);
      if (res.success) {
        toast.success('Client registered successfully');
        setShowModal(false);
        setFormData({
          client_code: '',
          company_name: '',
          tin_number: '',
          contact_person: '',
          email: '',
          phone: '',
          billing_address: '',
          delivery_address: '',
          credit_limit: 500000,
          payment_terms: '30 Days',
          credit_control_action: 'Require Approval'
        });
        loadClients();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to create client');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">B2B Corporate Clients</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Manage client accounts, credit limits, payment terms, and balances</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Client</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="relative w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company, code, contact..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-600"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Showing <strong>{clients.length}</strong> active client accounts
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <th className="py-3.5 px-4">Client Code</th>
              <th className="py-3.5 px-4">Company Name</th>
              <th className="py-3.5 px-4">Contact Person</th>
              <th className="py-3.5 px-4">Credit Terms</th>
              <th className="py-3.5 px-4 text-right">Credit Limit</th>
              <th className="py-3.5 px-4 text-right">Current Balance</th>
              <th className="py-3.5 px-4 text-center">Status</th>
              <th className="py-3.5 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clients.length === 0 ? (
              <tr>
                <td colSpan="8" className="py-8 text-center text-slate-400">No client accounts found.</td>
              </tr>
            ) : (
              clients.map(client => (
                <tr key={client.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3.5 px-4 font-bold text-teal-800">{client.client_code}</td>
                  <td className="py-3.5 px-4">
                    <strong className="text-slate-900 font-bold block">{client.company_name}</strong>
                    <span className="text-[11px] text-slate-400">{client.email}</span>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-700">
                    {client.contact_person}
                    <div className="text-[11px] text-slate-400">{client.phone}</div>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-700">{client.payment_terms}</td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-900">{formatCurrency(client.credit_limit)}</td>
                  <td className="py-3.5 px-4 text-right">
                    <strong className={`font-bold ${Number(client.current_balance) > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {formatCurrency(client.current_balance)}
                    </strong>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <StatusBadge status={client.credit_status} />
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <Link
                      to={`/ledger?client_id=${client.id}`}
                      className="p-1.5 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 rounded-lg inline-flex items-center gap-1 text-[11px] font-bold transition text-slate-600"
                      title="View Ledger & SOA"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Ledger</span>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* New Client Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Register B2B Client">
        <form onSubmit={handleCreateClient} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Client Code *</label>
              <input
                type="text"
                value={formData.client_code}
                onChange={e => setFormData({...formData, client_code: e.target.value})}
                placeholder="CLI-003"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-600"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Company Name *</label>
              <input
                type="text"
                value={formData.company_name}
                onChange={e => setFormData({...formData, company_name: e.target.value})}
                placeholder="ABC Beauty Labs Inc."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-600"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">TIN Number</label>
              <input
                type="text"
                value={formData.tin_number}
                onChange={e => setFormData({...formData, tin_number: e.target.value})}
                placeholder="123-456-789-000"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Contact Person *</label>
              <input
                type="text"
                value={formData.contact_person}
                onChange={e => setFormData({...formData, contact_person: e.target.value})}
                placeholder="Full Name"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-600"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                placeholder="orders@company.com"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-600"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone *</label>
              <input
                type="text"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                placeholder="+63 917 000 0000"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-600"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Credit Limit (₱)</label>
              <input
                type="number"
                value={formData.credit_limit}
                onChange={e => setFormData({...formData, credit_limit: Number(e.target.value)})}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Payment Terms</label>
              <select
                value={formData.payment_terms}
                onChange={e => setFormData({...formData, payment_terms: e.target.value})}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-600"
              >
                <option value="COD">Cash On Delivery (COD)</option>
                <option value="7 Days">7 Days</option>
                <option value="15 Days">15 Days</option>
                <option value="30 Days">30 Days</option>
                <option value="60 Days">60 Days</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Billing Address *</label>
            <textarea
              rows="2"
              value={formData.billing_address}
              onChange={e => setFormData({...formData, billing_address: e.target.value})}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-600"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Delivery Address *</label>
            <textarea
              rows="2"
              value={formData.delivery_address}
              onChange={e => setFormData({...formData, delivery_address: e.target.value})}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-600"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-sm"
            >
              Save Client Profile
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
