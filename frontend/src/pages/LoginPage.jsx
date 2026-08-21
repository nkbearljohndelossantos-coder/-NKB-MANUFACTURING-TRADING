import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, User, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(username, password);
      toast.success(`Welcome back, ${user.full_name || user.username}!`);
      if (user.role === 'CLIENT') {
        navigate('/portal');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (u, p) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-slate-100/30 w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-teal-700 text-white flex items-center justify-center font-black text-3xl mx-auto shadow-lg shadow-teal-700/30 mb-4">
            N
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">NKB MANUFACTURING</h2>
          <p className="text-xs font-bold text-teal-700 uppercase tracking-widest mt-1">B2B Order, Delivery & Variance Portal</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Username</label>
            <div className="relative">
              <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-teal-600 focus:bg-white outline-none transition"
                placeholder="Enter username"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-teal-600 focus:bg-white outline-none transition"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold text-sm shadow-md shadow-teal-700/20 transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                <span>Secure Sign In</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>Role Switcher (Quick Fill)</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Admin', u: 'admin', p: 'admin123' },
              { label: 'Manager', u: 'manager', p: 'admin123' },
              { label: 'Sales', u: 'sales', p: 'admin123' },
              { label: 'Warehouse', u: 'warehouse', p: 'admin123' },
              { label: 'Accounting', u: 'accounting', p: 'admin123' },
              { label: 'Client (ABC)', u: 'client_abc', p: 'admin123' }
            ].map(b => (
              <button
                key={b.u}
                type="button"
                onClick={() => handleQuickFill(b.u, b.p)}
                className="px-2 py-1.5 text-[11px] font-semibold bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-700 rounded-lg transition border border-slate-200/60 text-center"
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
