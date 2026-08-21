import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { formatDateTime } from '../utils/formatters';
import { useToast } from '../context/ToastContext';
import { History, Shield, Search, Lock } from 'lucide-react';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const toast = useToast();

  useEffect(() => {
    async function loadLogs() {
      try {
        const res = await api.get('/b2b/audit-logs?limit=100');
        if (res.success) setLogs(res.data);
      } catch (err) {
        toast.error('Failed to load audit logs');
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Enterprise Audit Trail</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Immutable, append-only security log of all financial and inventory mutations</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200">
          <Lock className="w-3.5 h-3.5 text-teal-700" />
          <span>Tamper-Proof Ledger</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <th className="py-3.5 px-4">Timestamp</th>
              <th className="py-3.5 px-4">User</th>
              <th className="py-3.5 px-4">Action</th>
              <th className="py-3.5 px-4">Entity</th>
              <th className="py-3.5 px-4">Reason / Notes</th>
              <th className="py-3.5 px-4">IP Address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map(log => (
              <tr key={log.id} className="hover:bg-slate-50/60 transition">
                <td className="py-3.5 px-4 text-slate-500 font-medium">{formatDateTime(log.created_at)}</td>
                <td className="py-3.5 px-4">
                  <strong className="text-slate-900 block font-bold">{log.full_name || log.username || 'System Engine'}</strong>
                  <span className="text-[10px] text-teal-700 font-bold uppercase">{log.user_role || 'SYSTEM'}</span>
                </td>
                <td className="py-3.5 px-4 font-bold text-slate-800">{log.action}</td>
                <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                  {log.entity_type} #{log.entity_id}
                </td>
                <td className="py-3.5 px-4 text-slate-700 font-medium max-w-xs">{log.reason || '—'}</td>
                <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">{log.ip_address || '127.0.0.1'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
