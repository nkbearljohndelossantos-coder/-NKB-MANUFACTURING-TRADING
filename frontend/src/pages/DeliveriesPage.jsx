import React, { useState, useEffect } from 'react';
import api from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import { formatDate } from '../utils/formatters';
import { useToast } from '../context/ToastContext';
import { Plus, Search, Truck, Eye, ShieldAlert, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [formData, setFormData] = useState({
    sales_order_id: '',
    delivery_date: new Date().toISOString().split('T')[0],
    driver_name: '',
    vehicle_plate: '',
    items: []
  });

  const toast = useToast();

  const loadData = async () => {
    try {
      const [delRes, orderRes] = await Promise.all([
        api.get(`/b2b/deliveries?search=${search}`),
        api.get('/b2b/orders?status=Confirmed')
      ]);
      if (delRes.success) setDeliveries(delRes.data);
      if (orderRes.success) setOrders(orderRes.data);
    } catch (err) {
      toast.error('Failed to load deliveries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search]);

  const handleSelectOrder = async (soId) => {
    try {
      const res = await api.get(`/b2b/orders/${soId}`);
      if (res.success) {
        setSelectedOrder(res.data);
        setFormData({
          ...formData,
          sales_order_id: soId,
          items: res.data.items.map(item => ({
            sales_order_item_id: item.id,
            product_id: item.product_id,
            product_name: item.product_name,
            ordered_qty: item.ordered_qty,
            delivered_qty: item.ordered_qty // Default delivered to ordered for quick editing
          }))
        });
      }
    } catch (err) {
      toast.error('Failed to fetch order details');
    }
  };

  const handleCreateDelivery = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/b2b/deliveries', formData);
      if (res.success) {
        toast.success(`Delivery Receipt ${res.data.delivery_number} prepared`);
        setShowModal(false);
        loadData();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to create delivery');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Warehouse Dispatches & Deliveries</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Track physical inventory dispatches, lot tracing, and delivery finalization</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Prepare Delivery Receipt (DR)</span>
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
            placeholder="Search DR#, SO#, client..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-600"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Showing <strong>{deliveries.length}</strong> delivery records
        </div>
      </div>

      {/* Deliveries Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <th className="py-3.5 px-4">DR Number</th>
              <th className="py-3.5 px-4">SO Number</th>
              <th className="py-3.5 px-4">Delivery Date</th>
              <th className="py-3.5 px-4">Client</th>
              <th className="py-3.5 px-4">Driver / Vehicle</th>
              <th className="py-3.5 px-4 text-center">Status</th>
              <th className="py-3.5 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {deliveries.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-8 text-center text-slate-400">No delivery records found.</td>
              </tr>
            ) : (
              deliveries.map(d => (
                <tr key={d.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3.5 px-4 font-bold text-teal-800">
                    <Link to={`/deliveries/${d.id}`} className="hover:underline">
                      {d.delivery_number}
                    </Link>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">{d.so_number}</td>
                  <td className="py-3.5 px-4 text-slate-600">{formatDate(d.delivery_date)}</td>
                  <td className="py-3.5 px-4">
                    <strong className="text-slate-900 font-bold block">{d.client_company_name}</strong>
                    <span className="text-[11px] text-slate-400">{d.client_code}</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 font-medium">
                    {d.driver_name || '—'} {d.vehicle_plate ? `(${d.vehicle_plate})` : ''}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <Link
                      to={`/deliveries/${d.id}`}
                      className="p-1.5 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 rounded-lg text-slate-600 font-bold transition inline-flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect</span>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Prepare Delivery Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Prepare Delivery Receipt (DR)" maxWidth="max-w-3xl">
        <form onSubmit={handleCreateDelivery} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Select Sales Order *</label>
              <select
                value={formData.sales_order_id}
                onChange={e => handleSelectOrder(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-teal-600"
                required
              >
                <option value="">Select Confirmed SO</option>
                {orders.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.so_number} - {o.client_company_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Driver Name</label>
              <input
                type="text"
                value={formData.driver_name}
                onChange={e => setFormData({...formData, driver_name: e.target.value})}
                placeholder="Driver Name"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Vehicle Plate #</label>
              <input
                type="text"
                value={formData.vehicle_plate}
                onChange={e => setFormData({...formData, vehicle_plate: e.target.value})}
                placeholder="NKB-1234"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
          </div>

          {selectedOrder && (
            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3">
                Items to Dispatch (Enter Actual Delivered Quantities)
              </h4>
              <div className="space-y-3">
                {formData.items.map((item, idx) => {
                  const variance = Number(item.delivered_qty || 0) - Number(item.ordered_qty || 0);
                  return (
                    <div key={idx} className="grid grid-cols-12 gap-3 items-center bg-white p-3 rounded-xl border border-slate-200 text-xs">
                      <div className="col-span-6">
                        <strong className="text-slate-900 block font-bold">{item.product_name}</strong>
                        <span className="text-[11px] text-slate-500">Ordered: {item.ordered_qty} units</span>
                      </div>
                      <div className="col-span-3">
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Actual Delivered Qty</label>
                        <input
                          type="number"
                          value={item.delivered_qty}
                          onChange={e => {
                            const updated = [...formData.items];
                            updated[idx].delivered_qty = Number(e.target.value);
                            setFormData({...formData, items: updated});
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-sm"
                          required
                        />
                      </div>
                      <div className="col-span-3 text-right">
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Variance Preview</label>
                        <span className={`font-black text-xs px-2 py-0.5 rounded ${
                          variance > 0 ? 'bg-amber-100 text-amber-800' :
                          variance < 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {variance > 0 ? `+${variance} OVER` : variance < 0 ? `${variance} UNDER` : 'Exact Match'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold">Cancel</button>
            <button type="submit" className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-sm">Create Delivery Record</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
