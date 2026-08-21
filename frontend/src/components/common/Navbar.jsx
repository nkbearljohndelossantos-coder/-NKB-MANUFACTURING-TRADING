import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User, Building2, Shield } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs no-print">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center font-black text-lg shadow-sm">
          N
        </div>
        <div>
          <h1 className="font-extrabold text-sm text-slate-900 leading-tight">NKB MANUFACTURING & TRADING</h1>
          <p className="text-[11px] text-teal-700 font-semibold tracking-wide uppercase">B2B Client Order, Delivery & Billing Engine</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs">
              {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-slate-800 leading-none">{user.full_name || user.username}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-bold text-teal-700 uppercase bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200/60">
                  {user.role}
                </span>
                {user.client && (
                  <span className="text-[10px] text-slate-500 font-medium truncate max-w-[120px]">
                    {user.client.company_name}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition border border-rose-200/60"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}
