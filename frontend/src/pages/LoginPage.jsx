import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ArrowRight, ShieldCheck, Factory, Truck, FileText, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
      addToast('Welcome back! Successfully authenticated.', 'success');
      navigate('/dashboard');
    } catch (err) {
      addToast(err.message || 'Invalid username or password', 'error');
    } finally {
      setLoading(false);
    }
  };

  const quickFill = (u, p) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 items-center justify-center text-white font-bold text-xl shadow-lg">
            B2B
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">NKB Cosmetics Manufacturing</h1>
          <p className="text-xs text-slate-400">Order, Compounding, Variance & Billing ERP</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">Username</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In to Portal'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-4 border-t border-slate-800">
          <div className="text-xs font-medium text-slate-400 mb-2">Quick Role Fill (Demo):</div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => quickFill('admin', 'admin123')}
              className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition"
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => quickFill('manager', 'admin123')}
              className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition"
            >
              Manager
            </button>
            <button
              type="button"
              onClick={() => quickFill('production', 'admin123')}
              className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition flex items-center justify-center gap-1"
            >
              <Factory className="w-3 h-3 text-indigo-400" />
              Production
            </button>
            <button
              type="button"
              onClick={() => quickFill('warehouse', 'admin123')}
              className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition flex items-center justify-center gap-1"
            >
              <Truck className="w-3 h-3 text-amber-400" />
              Warehouse
            </button>
            <button
              type="button"
              onClick={() => quickFill('accounting', 'admin123')}
              className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition flex items-center justify-center gap-1"
            >
              <FileText className="w-3 h-3 text-emerald-400" />
              Accounting
            </button>
            <button
              type="button"
              onClick={() => quickFill('client_abc', 'admin123')}
              className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition flex items-center justify-center gap-1"
            >
              <Building2 className="w-3 h-3 text-sky-400" />
              Client
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
