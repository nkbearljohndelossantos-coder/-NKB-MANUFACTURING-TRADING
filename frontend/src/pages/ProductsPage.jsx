import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { formatCurrency } from '../utils/formatters';
import { useToast } from '../context/ToastContext';
import Modal from '../components/common/Modal';
import { Plus, Search, Package, Layers, AlertTriangle } from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [formData, setFormData] = useState({
    sku: '',
    product_name: '',
    description: '',
    category_name: 'Skin Care',
    unit_of_measure: 'bottle',
    unit_price: 100,
    cost_price: 45,
    current_stock: 5000,
    minimum_stock: 500
  });

  const [batchData, setBatchData] = useState({
    batch_number: '',
    manufacturing_date: '',
    expiration_date: '',
    quantity: 1000
  });

  const toast = useToast();

  const loadProducts = async () => {
    try {
      const res = await api.get(`/b2b/products?search=${search}`);
      if (res.success) setProducts(res.data);
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [search]);

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/b2b/products', formData);
      if (res.success) {
        toast.success('Product created successfully');
        setShowModal(false);
        loadProducts();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to create product');
    }
  };

  const handleAddBatch = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;
    try {
      const res = await api.post(`/b2b/products/${selectedProduct.id}/batches`, batchData);
      if (res.success) {
        toast.success('Batch inventory added successfully');
        setShowBatchModal(false);
        loadProducts();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to add batch');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Cosmetics & Product Master</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Finished goods formulations, current stock, pricing and batch/lot tracking</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Formulation</span>
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
            placeholder="Search SKU, product name..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-600"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Showing <strong>{products.length}</strong> master formulation items
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <th className="py-3.5 px-4">SKU</th>
              <th className="py-3.5 px-4">Product Name</th>
              <th className="py-3.5 px-4">Category</th>
              <th className="py-3.5 px-4 text-right">Selling Price</th>
              <th className="py-3.5 px-4 text-right">Physical Stock</th>
              <th className="py-3.5 px-4">Active Batches / Lots</th>
              <th className="py-3.5 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map(p => {
              const isLowStock = Number(p.current_stock) <= Number(p.minimum_stock);
              return (
                <tr key={p.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3.5 px-4 font-bold text-teal-800">{p.sku}</td>
                  <td className="py-3.5 px-4">
                    <strong className="text-slate-900 font-bold block">{p.product_name}</strong>
                    <span className="text-[11px] text-slate-400 truncate max-w-xs block">{p.description}</span>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-700">{p.category_name}</td>
                  <td className="py-3.5 px-4 text-right font-black text-slate-900">{formatCurrency(p.unit_price)}</td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {isLowStock && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" title="Low Stock Warning" />}
                      <strong className={`font-black text-sm ${isLowStock ? 'text-amber-600' : 'text-slate-900'}`}>
                        {Number(p.current_stock).toLocaleString()}
                      </strong>
                      <span className="text-[11px] text-slate-400">{p.unit_of_measure}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    {p.batches && p.batches.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {p.batches.map(b => (
                          <span key={b.id} className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold border border-slate-200">
                            {b.batch_number} ({b.quantity_available})
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[11px]">No batches registered</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => {
                        setSelectedProduct(p);
                        setShowBatchModal(true);
                      }}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-700 rounded-lg text-[11px] font-bold transition inline-flex items-center gap-1"
                    >
                      <Layers className="w-3 h-3" />
                      <span>+ Batch</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Product Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add New Product Formulation">
        <form onSubmit={handleCreateProduct} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">SKU *</label>
              <input
                type="text"
                value={formData.sku}
                onChange={e => setFormData({...formData, sku: e.target.value})}
                placeholder="LOT-004"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-600"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Product Name *</label>
              <input
                type="text"
                value={formData.product_name}
                onChange={e => setFormData({...formData, product_name: e.target.value})}
                placeholder="Brightening Vitamin C Cream 50g"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-600"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
              <input
                type="text"
                value={formData.category_name}
                onChange={e => setFormData({...formData, category_name: e.target.value})}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Selling Price (₱) *</label>
              <input
                type="number"
                value={formData.unit_price}
                onChange={e => setFormData({...formData, unit_price: Number(e.target.value)})}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-600"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Initial Stock</label>
              <input
                type="number"
                value={formData.current_stock}
                onChange={e => setFormData({...formData, current_stock: Number(e.target.value)})}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
            <textarea
              rows="2"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold">Cancel</button>
            <button type="submit" className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-sm">Save Formulation</button>
          </div>
        </form>
      </Modal>

      {/* Add Batch Modal */}
      <Modal isOpen={showBatchModal} onClose={() => setShowBatchModal(false)} title={`Add Batch for ${selectedProduct?.product_name || ''}`}>
        <form onSubmit={handleAddBatch} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Batch / Lot Number *</label>
              <input
                type="text"
                value={batchData.batch_number}
                onChange={e => setBatchData({...batchData, batch_number: e.target.value})}
                placeholder="LOT-2026-B3"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-600"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Quantity Received *</label>
              <input
                type="number"
                value={batchData.quantity}
                onChange={e => setBatchData({...batchData, quantity: Number(e.target.value)})}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-600"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Manufacturing Date</label>
              <input
                type="date"
                value={batchData.manufacturing_date}
                onChange={e => setBatchData({...batchData, manufacturing_date: e.target.value})}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Expiration Date</label>
              <input
                type="date"
                value={batchData.expiration_date}
                onChange={e => setBatchData({...batchData, expiration_date: e.target.value})}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setShowBatchModal(false)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold">Cancel</button>
            <button type="submit" className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-sm">Receive Batch Stock</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
