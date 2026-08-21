import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import VarianceAlert from '../components/common/VarianceAlert';
import { formatDate } from '../utils/formatters';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Printer, ShieldCheck, AlertTriangle, CheckCircle, PackageCheck } from 'lucide-react';

export default function DeliveryDetailPage() {
  const { id } = useParams();
  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);
  const toast = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const loadDelivery = async () => {
    try {
      const res = await api.get(`/b2b/deliveries/${id}`);
      if (res.success) setDelivery(res.data);
    } catch (err) {
      toast.error('Failed to load delivery details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDelivery();
  }, [id]);

  const handleFinalizeDelivery = async () => {
    if (!window.confirm('Finalize delivery? Actual delivered quantities will be deducted from physical warehouse stock.')) return;
    setFinalizing(true);
    try {
      const res = await api.post(`/b2b/deliveries/${id}/finalize`, {
        reason: 'Production Overrun',
        proposed_treatment: 'FOC'
      });
      if (res.success) {
        toast.success(res.message);
        loadDelivery();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to finalize delivery');
    } finally {
      setFinalizing(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-400">Loading delivery...</div>;
  if (!delivery) return <div className="p-8 text-center text-rose-500 font-bold">Delivery not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/deliveries" className="p-2 bg-white rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">{delivery.delivery_number}</h2>
              <StatusBadge status={delivery.status} />
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Linked to {delivery.so_number} • Date: {formatDate(delivery.delivery_date)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={`/api/b2b/deliveries/${delivery.id}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Print Official DR</span>
          </a>
          {delivery.status === 'Preparing' && (
            <button
              onClick={handleFinalizeDelivery}
              disabled={finalizing}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-2"
            >
              <PackageCheck className="w-4 h-4" />
              <span>{finalizing ? 'Finalizing Stock...' : 'Finalize Delivery & Deduct Inventory'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Variance Alert Banner if detected */}
      {(delivery.variances || []).map(v => (
        <VarianceAlert
          key={v.id}
          varianceQty={v.variance_qty}
          orderedQty={v.ordered_qty}
          deliveredQty={v.delivered_qty}
          reason={v.reason}
          treatment={v.proposed_treatment}
          status={v.approval_status}
        />
      ))}

      {/* Items Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
            Delivered Line Items
          </h3>
        </div>
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <th className="py-3 px-4">Product / SKU</th>
              <th className="py-3 px-4">Batch / Lot #</th>
              <th className="py-3 px-4 text-center">Ordered Qty</th>
              <th className="py-3 px-4 text-center">Actual Delivered Qty</th>
              <th className="py-3 px-4 text-center">Variance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(delivery.items || []).map(item => {
              const varQty = Number(item.variance_qty);
              return (
                <tr key={item.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    {item.product_name}
                    <span className="text-[11px] text-slate-400 block font-normal">SKU: {item.sku}</span>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-700">{item.batch_number || 'Default Lot'}</td>
                  <td className="py-3.5 px-4 text-center font-bold text-slate-800">{Number(item.ordered_qty).toLocaleString()}</td>
                  <td className="py-3.5 px-4 text-center font-black text-slate-900 text-sm">{Number(item.delivered_qty).toLocaleString()}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className={`font-black px-2.5 py-0.5 rounded ${
                      varQty > 0 ? 'bg-amber-100 text-amber-800' :
                      varQty < 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {varQty > 0 ? `+${varQty}` : varQty}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
