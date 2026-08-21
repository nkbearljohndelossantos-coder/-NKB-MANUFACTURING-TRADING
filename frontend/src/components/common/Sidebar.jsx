import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  Truck,
  AlertCircle,
  FileText,
  CreditCard,
  BookOpen,
  BarChart3,
  History,
  Store
} from 'lucide-react';

export default function Sidebar() {
  const { user } = useAuth();
  const role = user?.role || '';

  const isClient = role === 'CLIENT';

  const staffNavItems = [
    { label: 'Mission Control', path: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER', 'SALES', 'WAREHOUSE', 'ACCOUNTING'] },
    { label: 'B2B Clients', path: '/clients', icon: Users, roles: ['ADMIN', 'MANAGER', 'SALES', 'ACCOUNTING'] },
    { label: 'Products & Stock', path: '/products', icon: Package, roles: ['ADMIN', 'MANAGER', 'SALES', 'WAREHOUSE', 'ACCOUNTING'] },
    { label: 'Sales Orders', path: '/orders', icon: ShoppingCart, roles: ['ADMIN', 'MANAGER', 'SALES', 'WAREHOUSE', 'ACCOUNTING'] },
    { label: 'Warehouse Deliveries', path: '/deliveries', icon: Truck, roles: ['ADMIN', 'MANAGER', 'WAREHOUSE', 'SALES'] },
    { label: 'Quantity Variances', path: '/variances', icon: AlertCircle, roles: ['ADMIN', 'MANAGER', 'SALES', 'WAREHOUSE', 'ACCOUNTING'] },
    { label: 'Billing Invoices', path: '/invoices', icon: FileText, roles: ['ADMIN', 'MANAGER', 'ACCOUNTING', 'SALES'] },
    { label: 'Payments & Collections', path: '/payments', icon: CreditCard, roles: ['ADMIN', 'MANAGER', 'ACCOUNTING'] },
    { label: 'Customer AR Ledger', path: '/ledger', icon: BookOpen, roles: ['ADMIN', 'MANAGER', 'ACCOUNTING', 'SALES'] },
    { label: 'Reports & Analytics', path: '/reports', icon: BarChart3, roles: ['ADMIN', 'MANAGER', 'SALES', 'ACCOUNTING'] },
    { label: 'Audit Trail', path: '/audit-logs', icon: History, roles: ['ADMIN', 'MANAGER'] },
  ];

  const clientNavItems = [
    { label: 'Client Dashboard', path: '/portal', icon: Store, roles: ['CLIENT'] },
    { label: 'My Purchase Orders', path: '/orders', icon: ShoppingCart, roles: ['CLIENT'] },
    { label: 'Shipment Deliveries', path: '/deliveries', icon: Truck, roles: ['CLIENT'] },
    { label: 'Variance Confirmations', path: '/variances', icon: AlertCircle, roles: ['CLIENT'] },
    { label: 'Invoices & Billing', path: '/invoices', icon: FileText, roles: ['CLIENT'] },
    { label: 'Payment History', path: '/payments', icon: CreditCard, roles: ['CLIENT'] },
    { label: 'Account Statement', path: '/ledger', icon: BookOpen, roles: ['CLIENT'] },
  ];

  const navItems = isClient ? clientNavItems : staffNavItems.filter(item => item.roles.includes(role) || role === 'ADMIN');

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 min-h-[calc(100vh-4rem)] flex flex-col justify-between p-4 border-r border-slate-800 no-print flex-shrink-0">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {isClient ? 'Client Portal' : 'Enterprise Modules'}
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-teal-700 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50 text-[11px]">
        <p className="text-slate-400">NKB Core B2B v2.0</p>
        <p className="text-teal-400 font-semibold mt-0.5">Connected: Production</p>
      </div>
    </aside>
  );
}
