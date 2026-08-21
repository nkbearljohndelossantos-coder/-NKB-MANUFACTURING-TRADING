import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Factory, ArrowLeft, CheckCircle, AlertTriangle, Layers, Plus, ShieldCheck, Clock, FileText } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import { formatDate } from '../utils/formatters';

export default function ProductionDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showOutputModal, setShowOutputModal] = useState(false);
  const [showDispositionModal, setShowDispositionModal] = useState(false);
  const [outputQty, setOutputQty] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [outputRemarks, setOutputRemarks] = useState('');
  const [selectedVariance, setSelectedVariance] = useState(null);
  const [dispositionType, setDispositionType] = useState('FOC');
  const [allocatedQty, setAllocatedQty] = useState('');
  const [dispRemarks, setDispRemarks] = useState('');

  const canRecordOutput = ['ADMIN', 'MANAGER', 'PRODUCTION'].includes(user?.role);
  const canApproveDisposition = ['ADMIN', 'MANAGER'].includes(user?.role);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/b2b/production/orders/${id}`);
      setPo(res.data.data);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to load production details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleRecordOutput = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/b2b/production/orders/${id}/record-output`, {
        output_quantity: Number(outputQty),
        operator_name: operatorName,
        remarks: outputRemarks
      });
      addToast('Production output recorded and finished goods stock updated', 'success');
      setShowOutputModal(false);
      setOutputQty('');
      fetchDetails();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to record output', 'error');
    }
  };

  const handleAssignDisposition = async (e) => {
    e.preventDefault();
    if (!selectedVariance) return;
    try {
      await api.post(`/b2b/production/variances/${selectedVariance.id}/disposition`, {
        dispositions: [
          {
            disposition_type: dispositionType,
            allocated_quantity: Number(allocatedQty),
            remarks: dispRemarks
          }
        ]
      });
      addToast('Excess disposition approved successfully', 'success');
      setShowDispositionModal(false);
      fetchDetails();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to assign disposition', 'error');
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading production order...</div>;
  if (!po) return <div className="p-8 text-center text-slate-500">Production order not found</div>;

  const target = Number(po.target_quantity || 0);
  const actual = Number(po.actual_produced_quantity || 0);
  const variance = actual - target;
  const yieldPercent = target > 0 ? ((actual / target) * 100).toFixed(1) : 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/production" className="p-2 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 text-slate-600 transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-800">{po.production_order_number}</h1>
              <StatusBadge status={po.production_status} />
            </div>
            <p className="text-sm text-slate-500">Sales Order: {po.so_number} • Client: {po.client_name}</p>
          </div>
        </div>

        {canRecordOutput && po.production_status !== 'COMPLETED' && (
          <button
            onClick={() => setShowOutputModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Log Compounding / Output
          </button>
        )}
      </div>

      {/* KPI Production Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold uppercase text-slate-400">Target Quantity</div>
          <div className="text-2xl font-bold text-slate-800 mt-1">{target.toLocaleString()} {po.unit}</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold uppercase text-slate-400">Actual Output Logged</div>
          <div className="text-2xl font-bold text-indigo-600 mt-1">{actual.toLocaleString()} {po.unit}</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold uppercase text-slate-400">Compounding Yield</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{yieldPercent}%</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold uppercase text-slate-400">Production Variance</div>
          <div className={`text-2xl font-bold mt-1 ${variance > 0 ? 'text-emerald-600' : variance < 0 ? 'text-amber-600' : 'text-slate-700'}`}>
            {variance > 0 ? `+${variance}` : variance} {po.unit}
          </div>
        </div>
      </div>

      {/* Overrun / Shortage Alerts */}
      {variance > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-emerald-900">PRODUCTION OVERRUN DETECTED (+{variance} {po.unit})</h3>
            <p className="text-sm text-emerald-700 mt-1">
              Compounding yield yielded an excess of {variance} units above the client's order target. Please assign an excess disposition (FOC, Additional Sale, Finished Goods Stock).
            </p>
            {canApproveDisposition && po.variances?.some(v => v.status === 'PENDING_REVIEW') && (
              <button
                onClick={() => {
                  setSelectedVariance(po.variances.find(v => v.status === 'PENDING_REVIEW'));
                  setAllocatedQty(String(variance));
                  setShowDispositionModal(true);
                }}
                className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition"
              >
                Assign Excess Disposition
              </button>
            )}
          </div>
        </div>
      )}

      {/* Output Logs & Inventory Traceability */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            Compounding Output Events & Inventory Receipts
          </h2>
          <span className="text-xs text-slate-500">Posts to Finished Goods Stock</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Event Date</th>
                <th className="px-6 py-3">Batch / Lot</th>
                <th className="px-6 py-3">Operator</th>
                <th className="px-6 py-3">Quality</th>
                <th className="px-6 py-3 text-right">Output Qty</th>
                <th className="px-6 py-3">Stock Posting</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {!po.outputs || po.outputs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-6 text-center text-slate-400">No output logged yet</td>
                </tr>
              ) : (
                po.outputs.map((out) => (
                  <tr key={out.id}>
                    <td className="px-6 py-4 text-slate-800 font-medium">{formatDate(out.output_date)}</td>
                    <td className="px-6 py-4 font-mono text-xs">{out.batch_number}</td>
                    <td className="px-6 py-4">{out.operator_name || 'Standard Production Line'}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-xs font-medium">
                        {out.quality_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900">
                      +{Number(out.output_quantity).toLocaleString()} {po.unit}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                        <CheckCircle className="w-3 h-3" />
                        Posted (+{out.output_quantity})
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dispositions Table */}
      {po.dispositions && po.dispositions.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-800">Approved Excess Dispositions</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {po.dispositions.map((d) => (
                <div key={d.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-xs font-semibold uppercase text-slate-500">Treatment: {d.disposition_type}</div>
                  <div className="text-xl font-bold text-slate-800 mt-1">{d.allocated_quantity} {po.unit}</div>
                  <div className="text-xs text-slate-500 mt-2">{d.remarks || 'Manager Approved'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Log Output Modal */}
      <Modal isOpen={showOutputModal} onClose={() => setShowOutputModal(false)} title="Log Compounding / Filling Output">
        <form onSubmit={handleRecordOutput} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Output Quantity ({po.unit})</label>
            <input
              type="number"
              required
              min="1"
              placeholder="e.g. 1100"
              value={outputQty}
              onChange={(e) => setOutputQty(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 font-bold"
            />
            <p className="text-xs text-slate-400 mt-1">This will automatically post +{outputQty || 0} into physical Finished Goods inventory.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Operator / Line Lead</label>
            <input
              type="text"
              placeholder="e.g. Juan Dela Cruz (Filling Line 2)"
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Remarks / Quality Notes</label>
            <textarea
              rows="2"
              placeholder="Compounding viscosity test passed, packaging intact"
              value={outputRemarks}
              onChange={(e) => setOutputRemarks(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            ></textarea>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowOutputModal(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium shadow-sm transition"
            >
              Post Output & Stock
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign Disposition Modal */}
      <Modal isOpen={showDispositionModal} onClose={() => setShowDispositionModal(false)} title="Assign Excess Production Disposition">
        <form onSubmit={handleAssignDisposition} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Disposition Type</label>
            <select
              value={dispositionType}
              onChange={(e) => setDispositionType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="FOC">Option A: Deliver as Free-Of-Charge (FOC Bonus)</option>
              <option value="ADDITIONAL_SALE">Option B: Additional Sale (Client Purchases Excess)</option>
              <option value="FINISHED_GOODS_STOCK">Option C: Retain in Company Warehouse Stock</option>
              <option value="REWORK">Option D: Rework</option>
              <option value="SCRAP">Option E: Scrap</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Allocated Quantity</label>
            <input
              type="number"
              required
              min="1"
              max={variance}
              value={allocatedQty}
              onChange={(e) => setAllocatedQty(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-slate-400 mt-1">Maximum assignable excess: {variance} units.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Manager Remarks / Rationale</label>
            <textarea
              rows="2"
              placeholder="e.g. Approved 100 bottles as promotional FOC for loyal customer"
              value={dispRemarks}
              onChange={(e) => setDispRemarks(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            ></textarea>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowDispositionModal(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition"
            >
              Confirm Disposition
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
