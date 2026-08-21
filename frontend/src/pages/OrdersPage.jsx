import React, { useState, useEffect } from 'react';
import api from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, ShoppingCart, Eye, AlertCircle, FileText, CheckCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);

  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    client_id: '',
    po_number: '',
    order_date: new Date().toISOString().split('T')[0],
    requested_delivery_date: '',
    remarks: '',
    items: [{ product_id: '', ordered_qty: 1000, unit_price: 100, discount_percent: 0 }]
  });

  const loadData = async () => {
    try {
      const [orderRes, clientRes, prodRes] = await Promise.all([
        api.get(`/b2b/orders?search=${search}&status=${statusFilter}`),
        api.get('/b2b/clients'),
        api.get('/b2b/products')
      ]);
      if (orderRes.success) setOrders(orderRes.data);
      if (clientRes.success) setClients(clientRes.data);
      if (prodRes.success) {
        setProducts(prodRes.data);
        if (prodRes.data.length > 0 && !formData.items[0].product_id) {
          setFormData(prev => ({
            ...prev,
            items: [{
              product_id: prodRes.data[0].id,
              ordered_qty: 1000,
              unit_price: prodRes.data[0].unit_price,
              discount_percent: 0
            }]
          }));
        }
      }
    } catch (err) {
      toast.error('Failed to load orders data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, statusFilter]);

  const handleAddItem = () => {
    const defaultProd = products[0];
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          product_id: defaultProd ? defaultProd.id : '',
          ordered_qty: 100,
          unit_price: defaultProd ? defaultProd.unit_price : 0,
          discount_percent: 0
        }
      ]
    });
  };

  const handleRemoveItem = (idx) => {
    if (formData.items.length === 1) return;
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== idx)
    });
  };

  const handleItemChange = (idx, field, val) => {
    const updated = [...formData.items];
    updated[idx][field] = val;

    if (field === 'product_id') {
      const prod = products.find(p => p.id === Number(val));
      if (prod) {
        updated[idx].unit_price = prod.unit_price;
      }
    }
    setFormData({ ...formData, items: updated });
  };

  const calculateTotal = () => {
    return formData.items.reduce((acc, item) => {
      const qty = Number(item.ordered_qty) || 0;
      const price = Number(item.unit_price) || 0;
      const disc = Number(item.discount_percent) || 0;
      return acc + (qty * price * (1 - disc / 100));
    }, 0);
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/b2b/orders', formData);
      if (res.success) {
        toast.success(`Sales Order ${res.data.so_number} created successfully`);
        if (res.creditWarning) {
          toast.warning(res.creditWarning);
        }
        setShowModal(false);
        loadData();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to create sales order');
    }
  };

  const handleConfirmOrder = async (orderId) => {
    try {
      const res = await api.put(`/b2b/orders/${orderId}/confirm`);
      if (res.success) {
        toast.success('Sales Order confirmed for warehouse preparation');
        loadData();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to confirm order');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Sales Orders (SO)</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Manage customer purchase orders, confirmations, and delivery dispatches</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Create Sales Order</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search SO#, PO#, client..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
          >
            <option value="">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Submitted">Submitted</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Delivered">Delivered</option>
            <option value="Invoiced">Invoiced</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Showing <strong>{orders.length}</strong> orders
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <th className="py-3.5 px-4">SO Number</th>
              <th className="py-3.5 px-4">Order Date</th>
              <th className="py-3.5 px-4">Client</th>
              <th className="py-3.5 px-4">PO Reference</th>
              <th className="py-3.5 px-4 text-right">Order Amount</th>
              <th className="py-3.5 px-4 text-center">Credit Check</th>
              <th className="py-3.5 px-4 text-center">Status</th>
              <th className="py-3.5 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.length === 0 ? (
              <tr>
                <td colSpan="8" className="py-8 text-center text-slate-400">No sales orders found.</td>
              </tr>
            ) : (
              orders.map(o => (
                <tr key={o.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3.5 px-4 font-bold text-teal-800">
                    <Link to={`/orders/${o.id}`} className="hover:underline">
                      {o.so_number}
                    </Link>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-600">{formatDate(o.order_date)}</td>
                  <td className="py-3.5 px-4">
                    <strong className="text-slate-900 font-bold block">{o.client_company_name}</strong>
                    <span className="text-[11px] text-slate-400">{o.client_code}</span>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-700">{o.po_number || '—'}</td>
                  <td className="py-3.5 px-4 text-right font-black text-slate-900">{formatCurrency(o.total_amount)}</td>
                  <td className="py-3.5 px-4 text-center">
                    {o.credit_check_passed ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-200">
                        <CheckCircle className="w-3 h-3" /> Passed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-[10px] font-bold border border-rose-200">
                        <AlertCircle className="w-3 h-3" /> Exceeded
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Link
                        to={`/orders/${o.id}`}
                        className="p-1.5 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 rounded-lg text-slate-600 font-bold transition"
                        title="View 360° Order Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Link>
                      {o.status === 'Submitted' && user?.role !== 'CLIENT' && (
                        <button
                          onClick={() => handleConfirmOrder(o.id)}
                          className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-[11px] font-bold transition"
                          title="Confirm Order"
                        >
                          Confirm
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Order Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create B2B Sales Order" maxWidth="max-w-4xl">
        <form onSubmit={handleCreateOrder} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Client *</label>
              <select
                value={formData.client_id}
                onChange={e => setFormData({...formData, client_id: e.target.value})}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-teal-600"
                required
              >
                <option value="">Select Corporate Client</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.company_name} ({c.client_code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Client PO Reference #</label>
              <input
                type="text"
                value={formData.po_number}
                onChange={e => setFormData({...formData, po_number: e.target.value})}
                placeholder="PO-ABC-2026-01"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Order Date</label>
              <input
                type="date"
                value={formData.order_date}
                onChange={e => setFormData({...formData, order_date: e.target.value})}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-600"
                required
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Order Line Items</h4>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-3">
              {formData.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-3 items-center bg-white p-3 rounded-xl border border-slate-200 text-xs">
                  <div className="col-span-5">
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Product Formulation</label>
                    <select
                      value={item.product_id}
                      onChange={e => handleItemChange(idx, 'product_id', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold outline-none"
                      required
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.product_name} (₱{p.unit_price})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Ordered Qty</label>
                    <input
                      type="number"
                      value={item.ordered_qty}
                      onChange={e => handleItemChange(idx, 'ordered_qty', e.target.value)}
                      min="1"
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Unit Price (₱)</label>
                    <input
                      type="number"
                      value={item.unit_price}
                      onChange={e => handleItemChange(idx, 'unit_price', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-right font-semibold"
                      required
                    />
                  </div>
                  <div className="col-span-2 text-right">
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Subtotal</label>
                    <strong className="text-slate-900 font-bold block pt-1">
                      {formatCurrency((Number(item.ordered_qty) || 0) * (Number(item.unit_price) || 0))}
                    </strong>
                  </div>
                  <div className="col-span-1 text-center pt-4">
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-rose-500 hover:text-rose-700 font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-200">
              <span className="text-xs font-bold text-slate-600">Calculated Grand Total:</span>
              <span className="text-base font-black text-teal-800">{formatCurrency(calculateTotal())}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Remarks & Instructions</label>
            <textarea
              rows="2"
              value={formData.remarks}
              onChange={e => setFormData({...formData, remarks: e.target.value})}
              placeholder="e.g., Deliver during warehouse working hours 8am-5pm"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold">Cancel</button>
            <button type="submit" className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-sm">Submit Sales Order</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
