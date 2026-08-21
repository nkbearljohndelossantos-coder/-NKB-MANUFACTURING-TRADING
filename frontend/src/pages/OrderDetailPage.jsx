import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Printer, Truck, FileText, CheckCircle, ShieldAlert } from 'lucide-react';

export default function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const { user } = useAuth();

  const loadOrder = async () => {
    try {
      const res = await api.get(`/b2b/orders/${id}`);
      if (res.success) setOrder(res.data);
    } catch (err) {
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading sales order...</div>;
  }

  if (!order) {
    return <div className="p-8 text-center text-rose-500 font-bold">Sales Order not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/orders" className="p-2 bg-white rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">{order.so_number}</h2>
              <StatusBadge status={order.status} />
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">PO Ref: {order.po_number || 'N/A'} • Placed on {formatDate(order.order_date)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={`/api/b2b/orders/${order.id}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Print Official SO</span>
          </a>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2 text-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Customer Information</span>
          <strong className="text-sm font-black text-slate-900 block">{order.company_name}</strong>
          <p className="text-slate-600">Contact: {order.contact_person} ({order.phone})</p>
          <p className="text-slate-600">Email: {order.email}</p>
          <p className="text-slate-600">TIN: {order.tin_number || 'N/A'}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2 text-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Delivery & Payment Terms</span>
          <p className="text-slate-700"><strong>Payment Terms:</strong> {order.payment_terms}</p>
          <p className="text-slate-700"><strong>Delivery Address:</strong> {order.delivery_address}</p>
          <p className="text-slate-700"><strong>Req. Delivery Date:</strong> {formatDate(order.requested_delivery_date)}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2 text-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Credit & Financial Summary</span>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500">Credit Status:</span>
            <span className="font-bold text-emerald-700">{order.credit_check_passed ? 'Approved' : 'Exceeded'}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500">Order Subtotal:</span>
            <strong className="text-slate-900">{formatCurrency(order.subtotal)}</strong>
          </div>
          <div className="flex justify-between pt-1">
            <span className="font-bold text-slate-700">Total Valuation:</span>
            <strong className="font-black text-teal-800 text-sm">{formatCurrency(order.total_amount)}</strong>
          </div>
        </div>
      </div>

      {/* Strict Quantity Separation Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
            Order Items & Strict Quantity Separation Matrix
          </h3>
        </div>
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <th className="py-3 px-4">Product / SKU</th>
              <th className="py-3 px-4 text-center">Ordered Qty</th>
              <th className="py-3 px-4 text-center">Delivered Qty</th>
              <th className="py-3 px-4 text-center">Variance Qty</th>
              <th className="py-3 px-4 text-center">Billable Qty</th>
              <th className="py-3 px-4 text-center">FOC Qty</th>
              <th className="py-3 px-4 text-center">Invoiced Qty</th>
              <th className="py-3 px-4 text-right">Unit Price</th>
              <th className="py-3 px-4 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(order.items || []).map(item => {
              const hasOverDelivery = Number(item.variance_qty) > 0;
              return (
                <tr key={item.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3.5 px-4">
                    <strong className="text-slate-900 font-bold block">{item.product_name}</strong>
                    <span className="text-[11px] text-slate-400">SKU: {item.sku}</span>
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-slate-800">{Number(item.ordered_qty).toLocaleString()}</td>
                  <td className="py-3.5 px-4 text-center font-bold text-slate-800">{Number(item.delivered_qty).toLocaleString()}</td>
                  <td className="py-3.5 px-4 text-center">
                    {Number(item.variance_qty) !== 0 ? (
                      <span className={`font-black px-2 py-0.5 rounded ${hasOverDelivery ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>
                        {hasOverDelivery ? '+' : ''}{Number(item.variance_qty).toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center font-black text-teal-800">
                    {Number(item.billable_qty).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {Number(item.foc_qty) > 0 ? (
                      <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-black">
                        {Number(item.foc_qty).toLocaleString()} FOC
                      </span>
                    ) : (
                      '0'
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center font-semibold text-slate-700">{Number(item.invoiced_qty).toLocaleString()}</td>
                  <td className="py-3.5 px-4 text-right text-slate-700 font-semibold">{formatCurrency(item.unit_price)}</td>
                  <td className="py-3.5 px-4 text-right font-black text-slate-900">{formatCurrency(item.subtotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
