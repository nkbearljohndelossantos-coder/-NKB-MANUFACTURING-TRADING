import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  ShoppingCart, 
  Factory,
  Truck, 
  Scale, 
  FileText, 
  CreditCard, 
  BookOpen, 
  BarChart3, 
  ShieldAlert,
  Building2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar() {
  const { user } = useAuth();
  const role = user?.role || 'SALES';

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER', 'SALES', 'PRODUCTION', 'WAREHOUSE', 'ACCOUNTING'] },
    { label: 'Client Portal', path: '/portal', icon: Building2, roles: ['CLIENT', 'ADMIN', 'SALES'] },
    { label: 'B2B Clients', path: '/clients', icon: Users, roles: ['ADMIN', 'MANAGER', 'SALES', 'ACCOUNTING'] },
    { label: 'Cosmetics Catalog', path: '/products', icon: Package, roles: ['ADMIN', 'MANAGER', 'SALES', 'PRODUCTION', 'WAREHOUSE', 'ACCOUNTING'] },
    { label: 'Sales Orders', path: '/orders', icon: ShoppingCart, roles: ['ADMIN', 'MANAGER', 'SALES', 'PRODUCTION', 'WAREHOUSE', 'ACCOUNTING', 'CLIENT'] },
    { label: 'Manufacturing / PO', path: '/production', icon: Factory, roles: ['ADMIN', 'MANAGER', 'PRODUCTION', 'WAREHOUSE', 'SALES'] },
    { label: 'Warehouse Dispatches', path: '/deliveries', icon: Truck, roles: ['ADMIN', 'MANAGER', 'PRODUCTION', 'WAREHOUSE', 'ACCOUNTING', 'CLIENT'] },
    { label: 'Quantity Variances', path: '/variances', icon: Scale, roles: ['ADMIN', 'MANAGER', 'PRODUCTION', 'SALES', 'ACCOUNTING'] },
    { label: 'Billing Invoices', path: '/invoices', icon: FileText, roles: ['ADMIN', 'MANAGER', 'ACCOUNTING', 'SALES', 'CLIENT'] },
    { label: 'Payments & OR', path: '/payments', icon: CreditCard, roles: ['ADMIN', 'MANAGER', 'ACCOUNTING', 'CLIENT'] },
    { label: 'Customer Ledger', path: '/ledger', icon: BookOpen, roles: ['ADMIN', 'MANAGER', 'ACCOUNTING', 'CLIENT'] },
    { label: 'Executive Reports', path: '/reports', icon: BarChart3, roles: ['ADMIN', 'MANAGER', 'ACCOUNTING', 'SALES', 'PRODUCTION'] },
    { label: 'Audit Logs', path: '/audit-logs', icon: ShieldAlert, roles: ['ADMIN'] }
  ];

  const visibleItems = navItems.filter(item => item.roles.includes(role));

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 min-h-screen">
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-md">
          B2B
        </div>
        <div>
          <div className="font-bold text-white tracking-wide text-sm">NKB COSMETICS</div>
          <div className="text-[11px] text-slate-400 font-medium">Manufacturing & ERP</div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 py-2">
          Enterprise Modules
        </div>
        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 text-xs text-slate-500 flex items-center justify-between">
        <span>Role: <strong className="text-slate-300">{role}</strong></span>
        <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">v2.0</span>
      </div>
    </aside>
  );
}
