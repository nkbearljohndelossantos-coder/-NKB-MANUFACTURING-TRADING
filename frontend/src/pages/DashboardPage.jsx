import React, { useState, useEffect } from 'react';
import api from '../services/api';
import KPICard from '../components/common/KPICard';
import StatusBadge from '../components/common/StatusBadge';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Link } from 'react-router-dom';
import {
  ShoppingCart,
  Truck,
  AlertTriangle,
  FileText,
  CreditCard,
  Package,
  ArrowRight,
  TrendingUp,
  ShieldCheck
} from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState([]);
  const [pendingVariances, setPendingVariances] = useState([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [dashRes, ordersRes, varRes] = await Promise.all([
          api.get('/b2b/reports/dashboard'),
          api.get('/b2b/orders?limit=5'),
          api.get('/b2b/variances?status=Pending Approval')
        ]);
        if (dashRes.success) setStats(dashRes.data);
        if (ordersRes.success) setRecentOrders(ordersRes.data.slice(0, 5));
        if (varRes.success) setPendingVariances(varRes.data.slice(0, 5));
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-teal-600/30 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  const kpis = stats?.kpis || {};

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Mission Control & Analytics</h2>
        <p className="text-xs text-slate-500 font-medium mt-0.5">Real-time B2B orders, dispatch metrics, variances and collections</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Orders"
          value={kpis.totalOrders || 0}
          subtitle={`${kpis.pendingOrders || 0} pending confirmation`}
          icon={ShoppingCart}
          color="brand"
        />
        <KPICard
          title="Pending Variances"
          value={kpis.pendingVariances || 0}
          subtitle="Requires Manager Approval"
          icon={AlertTriangle}
          color={kpis.pendingVariances > 0 ? 'amber' : 'emerald'}
        />
        <KPICard
          title="Total Invoiced"
          value={formatCurrency(kpis.totalInvoiced || 0)}
          subtitle={`Collected: ${formatCurrency(kpis.totalCollected || 0)}`}
          icon={FileText}
          color="blue"
        />
        <KPICard
          title="Outstanding AR"
          value={formatCurrency(kpis.outstandingReceivables || 0)}
          subtitle="Total Client Receivables"
          icon={CreditCard}
          color={kpis.outstandingReceivables > 0 ? 'rose' : 'emerald'}
        />
      </div>

      {/* Variance Alert Banner */}
      {pendingVariances.length > 0 && (
        <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500 text-white rounded-xl shadow-md">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-black text-slate-900 text-base">
                {pendingVariances.length} Quantity Variance(s) Awaiting Manager Review
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">
                Over-delivery / under-delivery items require approved billable and FOC classification before invoicing.
              </p>
            </div>
          </div>
          <Link
            to="/variances"
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-1.5"
          >
            <span>Resolve Variances</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800">Recent Sales Orders</h3>
            <Link to="/orders" className="text-xs font-bold text-teal-700 hover:underline flex items-center gap-1">
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {recentOrders.length === 0 ? (
              <div className="p-6 text-center text-slate-400">No recent orders found.</div>
            ) : (
              recentOrders.map(order => (
                <div key={order.id} className="p-4 flex items-center justify-between hover:bg-slate-50/80 transition">
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-slate-900 font-bold">{order.so_number}</strong>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="text-slate-500 font-medium mt-0.5">{order.client_company_name}</p>
                  </div>
                  <div className="text-right">
                    <strong className="text-slate-900 font-bold block">{formatCurrency(order.total_amount)}</strong>
                    <span className="text-[11px] text-slate-400">{formatDate(order.order_date)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Cosmetics Products */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800">Top Selling Formulations</h3>
            <Link to="/products" className="text-xs font-bold text-teal-700 hover:underline flex items-center gap-1">
              <span>Product Master</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {(stats?.topProducts || []).length === 0 ? (
              <div className="p-6 text-center text-slate-400">No sales data recorded yet.</div>
            ) : (
              (stats?.topProducts || []).map((p, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50/80 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-800 font-black text-xs flex items-center justify-center border border-teal-200/60">
                      {idx + 1}
                    </div>
                    <div>
                      <strong className="text-slate-900 font-bold block">{p.product_name}</strong>
                      <span className="text-slate-400 text-[11px]">SKU: {p.sku}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <strong className="text-slate-900 font-bold block">{formatCurrency(p.total_value)}</strong>
                    <span className="text-teal-700 font-bold text-[11px]">{Number(p.total_qty).toLocaleString()} units</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
