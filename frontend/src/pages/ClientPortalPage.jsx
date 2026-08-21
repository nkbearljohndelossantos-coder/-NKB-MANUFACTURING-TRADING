import React, { useState, useEffect } from 'react';
import api from '../services/api';
import KPICard from '../components/common/KPICard';
import StatusBadge from '../components/common/StatusBadge';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { ShoppingCart, Truck, AlertCircle, FileText, CreditCard, ArrowRight } from 'lucide-react';

export default function ClientPortalPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [dashRes, orderRes] = await Promise.all([
          api.get('/b2b/reports/dashboard'),
          api.get('/b2b/orders?limit=5')
        ]);
        if (dashRes.success) setStats(dashRes.data);
        if (orderRes.success) setRecentOrders(orderRes.data.slice(0, 5));
      } catch (err) {
        console.error('Failed to load client portal:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const kpis = stats?.kpis || {};

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Client Account Portal</h2>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Welcome, <strong>{user?.client?.company_name || user?.full_name}</strong> • Track your purchase orders, dispatches, and billing
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="My Active Orders" value={kpis.totalOrders || 0} icon={ShoppingCart} color="brand" />
        <KPICard title="Shipments For Delivery" value={kpis.readyForDelivery || 0} icon={Truck} color="blue" />
        <KPICard title="Pending Confirmations" value={kpis.pendingVariances || 0} icon={AlertCircle} color={kpis.pendingVariances > 0 ? 'amber' : 'emerald'} />
        <KPICard title="Outstanding Balance" value={formatCurrency(kpis.outstandingReceivables || 0)} icon={CreditCard} color="rose" />
      </div>

      {/* Orders */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-800">My Purchase Orders</h3>
          <Link to="/orders" className="text-xs font-bold text-teal-700 hover:underline flex items-center gap-1">
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="divide-y divide-slate-100 text-xs">
          {recentOrders.map(order => (
            <div key={order.id} className="p-4 flex items-center justify-between hover:bg-slate-50/80 transition">
              <div>
                <div className="flex items-center gap-2">
                  <strong className="text-slate-900 font-bold">{order.so_number}</strong>
                  <StatusBadge status={order.status} />
                </div>
                <p className="text-slate-500 font-medium mt-0.5">PO: {order.po_number || 'N/A'}</p>
              </div>
              <div className="text-right">
                <strong className="text-slate-900 font-bold block">{formatCurrency(order.total_amount)}</strong>
                <span className="text-[11px] text-slate-400">{formatDate(order.order_date)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
