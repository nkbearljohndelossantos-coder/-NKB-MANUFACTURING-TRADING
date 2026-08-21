import React from 'react';
import { AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';

export default function VarianceAlert({ varianceQty, orderedQty, deliveredQty, reason, treatment, status }) {
  if (!varianceQty || varianceQty === 0) return null;

  const isOverDelivery = varianceQty > 0;

  return (
    <div className={`rounded-2xl border p-5 ${
      isOverDelivery ? 'bg-amber-50/80 border-amber-200' : 'bg-rose-50/80 border-rose-200'
    }`}>
      <div className="flex items-start gap-4">
        <div className={`p-2.5 rounded-xl border ${
          isOverDelivery ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-rose-100 border-rose-300 text-rose-800'
        }`}>
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className={`font-black text-base ${isOverDelivery ? 'text-amber-900' : 'text-rose-900'}`}>
              {isOverDelivery ? '⚠️ OVER-DELIVERY DETECTED' : '⚠️ UNDER-DELIVERY DETECTED'}
            </h4>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
              status === 'Approved' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-200 text-amber-900 border-amber-300'
            }`}>
              {status || 'Pending Manager Approval'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 bg-white/80 p-3 rounded-xl border border-amber-200/60 text-xs">
            <div>
              <span className="text-slate-500 block">Ordered Qty:</span>
              <strong className="text-slate-800 text-sm">{Number(orderedQty).toLocaleString()}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Delivered Qty:</span>
              <strong className="text-slate-800 text-sm">{Number(deliveredQty).toLocaleString()}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Variance Qty:</span>
              <strong className={`text-sm ${isOverDelivery ? 'text-amber-700' : 'text-rose-700'}`}>
                {isOverDelivery ? '+' : ''}{Number(varianceQty).toLocaleString()}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block">Proposed Action:</span>
              <strong className="text-slate-800 text-sm">{treatment || 'FOC / Pending Approval'}</strong>
            </div>
          </div>

          {reason && (
            <p className="text-xs text-amber-900/80 mt-2">
              <strong>Tagged Reason:</strong> {reason}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
