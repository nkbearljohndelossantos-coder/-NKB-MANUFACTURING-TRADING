import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Factory, Plus, Search, Filter, Play, CheckCircle, Clock, AlertTriangle, Layers } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import { formatDate } from '../utils/formatters';

export default function ProductionOrdersPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [salesOrders, setSalesOrders] = useState([]);
  const [formData, setFormData] = useState({
    sales_order_id: '',
    target_quantity: '',
    batch_number: '',
    planned_start_date: new Date().toISOString().split('T')[0],
    remarks: ''
  });

  const canCreate = ['ADMIN', 'MANAGER', 'PRODUCTION', 'SALES'].includes(user?.role);
  const canStart = ['ADMIN', 'MANAGER', 'PRODUCTION'].includes(user?.role);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/b2b/production/orders', { params });
      setOrders(res.data.data || []);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to load production orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesOrders = async () => {
    try {
      const res = await api.get('/b2b/orders');
      setSalesOrders(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [search, statusFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/b2b/production/orders', formData);
      addToast('Production Order created successfully', 'success');
      setShowModal(false);
      fetchOrders();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to create production order', 'error');
    }
  };

  const handleStartProduction = async (id) => {
    try {
      await api.put(`/b2b/production/orders/${id}/start`);
      addToast('Production run started', 'success');
      fetchOrders();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to start production', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Factory className="w-7 h-7 text-indigo-600" />
            Manufacturing & Production Orders
          </h1>
          <p className="text-sm text-slate-500">Track cosmetics compounding, batch production targets, and actual output</p>
        </div>
        {canCreate && (
          <button
            onClick={() => {
              fetchSalesOrders();
              setShowModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            New Production Order
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by PO number, batch, product, or client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="sm:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="PLANNED">Planned</option>
            <option value="IN_PRODUCTION">In Production</option>
            <option value="COMPLETED">Completed</option>
            <option value="ON_HOLD">On Hold</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">PO Number</th>
                <th className="px-6 py-4">Client & Product</th>
                <th className="px-6 py-4">Batch / Lot</th>
                <th className="px-6 py-4 text-right">Target</th>
                <th className="px-6 py-4 text-right">Actual Output</th>
                <th className="px-6 py-4 text-center">Variance</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-slate-400">Loading production orders...</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-slate-400">No production orders found</td>
                </tr>
              ) : (
                orders.map((po) => {
                  const variance = Number(po.actual_produced_quantity || 0) - Number(po.target_quantity || 0);
                  return (
                    <tr key={po.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 font-semibold text-indigo-600">
                        <Link to={`/production/${po.id}`} className="hover:underline">
                          {po.production_order_number}
                        </Link>
                        <div className="text-xs text-slate-400 font-normal">{po.so_number}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-800">{po.product_name}</div>
                        <div className="text-xs text-slate-500">{po.client_name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                          {po.batch_number}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-slate-700">
                        {Number(po.target_quantity).toLocaleString()} {po.unit}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-900">
                        {Number(po.actual_produced_quantity || 0).toLocaleString()} {po.unit}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {po.actual_produced_quantity > 0 ? (
                          variance > 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              +{variance} (Overrun)
                            </span>
                          ) : variance < 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                              {variance} (Shortage)
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500 font-medium">Exact (0)</span>
                          )
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={po.production_status} />
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {canStart && po.production_status === 'PLANNED' && (
                          <button
                            onClick={() => handleStartProduction(po.id)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded text-xs font-medium border border-amber-200 transition"
                          >
                            <Play className="w-3 h-3" />
                            Start Run
                          </button>
                        )}
                        <Link
                          to={`/production/${po.id}`}
                          className="inline-flex items-center px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium transition"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Production Order Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create New Production Order">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Select Confirmed Sales Order</label>
            <select
              required
              value={formData.sales_order_id}
              onChange={(e) => {
                const so = salesOrders.find(s => String(s.id) === e.target.value);
                setFormData({
                  ...formData,
                  sales_order_id: e.target.value,
                  target_quantity: so ? 1000 : formData.target_quantity
                });
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Choose Sales Order --</option>
              {salesOrders.map(so => (
                <option key={so.id} value={so.id}>
                  {so.so_number} - {so.client_company_name || 'Client'} (Total: ₱{Number(so.total_amount).toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Target Production Quantity</label>
              <input
                type="number"
                required
                min="1"
                placeholder="e.g. 1000"
                value={formData.target_quantity}
                onChange={(e) => setFormData({ ...formData, target_quantity: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Batch / Lot Number</label>
              <input
                type="text"
                placeholder="Auto-generated if blank"
                value={formData.batch_number}
                onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Planned Start Date</label>
            <input
              type="date"
              value={formData.planned_start_date}
              onChange={(e) => setFormData({ ...formData, planned_start_date: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Manufacturing Remarks</label>
            <textarea
              rows="2"
              placeholder="e.g. Special viscosity requirements, standard filling speed"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            ></textarea>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition"
            >
              Create Production Order
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
