import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import { exportToCsv } from '../utils/exportUtils';
import { useToast } from '../context/ToastContext';
import { BarChart3, Download, Calendar, Filter } from 'lucide-react';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('sales');
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const loadReport = async () => {
    setLoading(true);
    try {
      let endpoint = '/b2b/reports/sales';
      if (activeTab === 'variances') endpoint = '/b2b/reports/variances';
      else if (activeTab === 'aging') endpoint = '/b2b/reports/receivables';

      const res = await api.get(endpoint);
      if (res.success) setReportData(res.data);
    } catch (err) {
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [activeTab]);

  const handleExportCsv = () => {
    if (!reportData.length) return;
    exportToCsv(`NKB_Report_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`, reportData);
    toast.success('Report exported to CSV');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Executive Reports & Audits</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Sales performance, variance & FOC audit trails, and AR aging schedules</p>
        </div>
        <button
          onClick={handleExportCsv}
          className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          <span>Export to CSV / Excel</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-bold">
        {[
          { id: 'sales', label: 'Sales Orders Report' },
          { id: 'variances', label: 'Over-Delivery & FOC Audit' },
          { id: 'aging', label: 'Accounts Receivable Aging' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-xl transition ${
              activeTab === t.id
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Generating report...</div>
        ) : (
          <div className="overflow-x-auto">
            {activeTab === 'sales' && (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">SO Number</th>
                    <th className="py-3 px-4">Order Date</th>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4 text-right">Order Valuation</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50/60">
                      <td className="py-3.5 px-4 font-bold text-teal-800">{r.so_number}</td>
                      <td className="py-3.5 px-4 text-slate-600">{formatDate(r.order_date)}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{r.company_name}</td>
                      <td className="py-3.5 px-4 text-right font-black text-slate-900">{formatCurrency(r.total_amount)}</td>
                      <td className="py-3.5 px-4 text-center font-semibold text-slate-700">{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'variances' && (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">DR #</th>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4 text-center">Ordered</th>
                    <th className="py-3 px-4 text-center">Delivered</th>
                    <th className="py-3 px-4 text-center">Variance</th>
                    <th className="py-3 px-4 text-center">Billable Qty</th>
                    <th className="py-3 px-4 text-center">FOC Qty</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50/60">
                      <td className="py-3.5 px-4 font-bold text-teal-800">{r.delivery_number}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{r.company_name}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">{r.product_name}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-700">{Number(r.ordered_qty).toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-900">{Number(r.delivered_qty).toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-center font-black text-amber-700">+{Number(r.variance_qty).toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-center font-black text-teal-800">{Number(r.billable_qty).toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-amber-800">{Number(r.foc_qty).toLocaleString()} FOC</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">{r.reason}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-emerald-700">{r.approval_status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'aging' && (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Client Company</th>
                    <th className="py-3 px-4">Credit Terms</th>
                    <th className="py-3 px-4 text-right">Current</th>
                    <th className="py-3 px-4 text-right">1-30 Days</th>
                    <th className="py-3 px-4 text-right">31-60 Days</th>
                    <th className="py-3 px-4 text-right">61-90 Days</th>
                    <th className="py-3 px-4 text-right">90+ Days</th>
                    <th className="py-3 px-4 text-right">Total Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50/60">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{r.company_name}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">{r.payment_terms}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-700">{formatCurrency(r.current)}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-amber-700">{formatCurrency(r.d1_30)}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-amber-800">{formatCurrency(r.d31_60)}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-rose-600">{formatCurrency(r.d61_90)}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-rose-700">{formatCurrency(r.d90_plus)}</td>
                      <td className="py-3.5 px-4 text-right font-black text-rose-600 text-sm">{formatCurrency(r.current_balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
