import React, { useState, useEffect } from 'react';
import api from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle, CheckCircle, ShieldCheck, Eye, Search, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function VariancesPage() {
  const [variances, setVariances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVariance, setSelectedVariance] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  const [approvalData, setApprovalData] = useState({
    status: 'Approved',
    billable_qty: 1000,
    foc_qty: 100,
    reason: 'Production Overrun',
    treatment: 'FOC',
    remarks: 'Approved extra units as Free Of Charge bonus'
  });

  const toast = useToast();
  const { user } = useAuth();

  const loadVariances = async () => {
    try {
      const res = await api.get('/b2b/variances');
      if (res.success) setVariances(res.data);
    } catch (err) {
      toast.error('Failed to load quantity variances');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVariances();
  }, []);

  const openApproveModal = (v) => {
    setSelectedVariance(v);
    setApprovalData({
      status: 'Approved',
      billable_qty: v.ordered_qty, // Default billable = ordered
      foc_qty: v.variance_qty > 0 ? v.variance_qty : 0,
      reason: v.reason || 'Production Overrun',
      treatment: v.proposed_treatment || 'FOC',
      remarks: 'Approved production overrun quantity as FOC'
    });
    setShowApprovalModal(true);
  };

  const handleApprove = async (e) => {
    e.preventDefault();
    if (!selectedVariance) return;
    try {
      const res = await api.put(`/b2b/variances/${selectedVariance.id}/approve`, approvalData);
      if (res.success) {
        toast.success(res.message);
        setShowApprovalModal(false);
        loadVariances();
      }
    } catch (err) {
      toast.error(err.message || 'Approval failed');
    }
  };

  const isManagerOrAdmin = ['ADMIN', 'MANAGER'].includes(user?.role);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Quantity Variance & Approval Queue</h2>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Mandatory governance module: Prevents silent over-billing and establishes approved Billable vs. FOC Quantities
        </p>
      </div>

      {/* Variances Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <th className="py-3.5 px-4">DR / SO Ref</th>
              <th className="py-3.5 px-4">Client</th>
              <th className="py-3.5 px-4">Product Formulation</th>
              <th className="py-3.5 px-4 text-center">Ordered</th>
              <th className="py-3.5 px-4 text-center">Delivered</th>
              <th className="py-3.5 px-4 text-center">Variance</th>
              <th className="py-3.5 px-4">Tagged Reason</th>
              <th className="py-3.5 px-4 text-center">Billable / FOC</th>
              <th className="py-3.5 px-4 text-center">Approval Status</th>
              <th className="py-3.5 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {variances.length === 0 ? (
              <tr>
                <td colSpan="10" className="py-8 text-center text-slate-400">No quantity variances recorded.</td>
              </tr>
            ) : (
              variances.map(v => (
                <tr key={v.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3.5 px-4">
                    <strong className="text-teal-800 block font-bold">{v.delivery_number}</strong>
                    <span className="text-[11px] text-slate-400">{v.so_number}</span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">{v.client_company_name}</td>
                  <td className="py-3.5 px-4">
                    <strong className="text-slate-800 block font-bold">{v.product_name}</strong>
                    <span className="text-[11px] text-slate-400">SKU: {v.sku}</span>
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-slate-700">{Number(v.ordered_qty).toLocaleString()}</td>
                  <td className="py-3.5 px-4 text-center font-bold text-slate-900">{Number(v.delivered_qty).toLocaleString()}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="font-black px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                      +{Number(v.variance_qty).toLocaleString()}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-700">{v.reason}</td>
                  <td className="py-3.5 px-4 text-center font-bold">
                    <span className="text-teal-800">{Number(v.billable_qty).toLocaleString()} Bill</span>
                    {Number(v.foc_qty) > 0 && (
                      <span className="text-amber-800 block text-[11px]">+{Number(v.foc_qty).toLocaleString()} FOC</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <StatusBadge status={v.approval_status} />
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {v.approval_status === 'Pending Approval' && isManagerOrAdmin ? (
                      <button
                        onClick={() => openApproveModal(v)}
                        className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-[11px] font-bold shadow-xs transition inline-flex items-center gap-1"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Finalized</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Approval Modal */}
      <Modal isOpen={showApprovalModal} onClose={() => setShowApprovalModal(false)} title="Manager Variance Resolution & Approval">
        <form onSubmit={handleApprove} className="space-y-4">
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-xs">
            <p className="font-bold text-amber-900">Over-Delivery Details:</p>
            <p className="text-amber-800 mt-1">
              Ordered: <strong>{selectedVariance?.ordered_qty}</strong> units | Delivered: <strong>{selectedVariance?.delivered_qty}</strong> units | Over: <strong>+{selectedVariance?.variance_qty}</strong> units
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Approved Billable Quantity *</label>
              <input
                type="number"
                value={approvalData.billable_qty}
                onChange={e => setApprovalData({...approvalData, billable_qty: Number(e.target.value)})}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-teal-600"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Approved FOC Quantity *</label>
              <input
                type="number"
                value={approvalData.foc_qty}
                onChange={e => setApprovalData({...approvalData, foc_qty: Number(e.target.value)})}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-teal-600"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Reason</label>
              <select
                value={approvalData.reason}
                onChange={e => setApprovalData({...approvalData, reason: e.target.value})}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-teal-600"
              >
                <option value="Production Overrun">Production Overrun</option>
                <option value="Free / FOC">Free / FOC</option>
                <option value="Client Requested Additional Quantity">Client Requested Additional Quantity</option>
                <option value="Replacement">Replacement</option>
                <option value="Sample">Sample</option>
                <option value="Warehouse Error">Warehouse Error</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Billing Treatment</label>
              <select
                value={approvalData.treatment}
                onChange={e => setApprovalData({...approvalData, treatment: e.target.value})}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-teal-600"
              >
                <option value="FOC">FOC (Bill Ordered Qty Only)</option>
                <option value="Bill Delivered Quantity">Bill Full Delivered Quantity</option>
                <option value="Partial Bill">Partial Bill</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Manager Remarks</label>
            <textarea
              rows="2"
              value={approvalData.remarks}
              onChange={e => setApprovalData({...approvalData, remarks: e.target.value})}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setShowApprovalModal(false)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold">Cancel</button>
            <button type="submit" className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-sm">Authorize & Approve Variance</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
