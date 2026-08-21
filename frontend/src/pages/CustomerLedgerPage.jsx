import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Printer, Search, Building2 } from 'lucide-react';

export default function CustomerLedgerPage() {
  const [searchParams] = useSearchParams();
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState(searchParams.get('client_id') || '');
  const [clientData, setClientData] = useState(null);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  const toast = useToast();

  useEffect(() => {
    async function loadClients() {
      try {
        if (user?.role === 'CLIENT' && user.client_id) {
          setSelectedClientId(String(user.client_id));
        } else {
          const res = await api.get('/b2b/clients');
          if (res.success) {
            setClients(res.data);
            if (!selectedClientId && res.data.length > 0) {
              setSelectedClientId(String(res.data[0].id));
            }
          }
        }
      } catch (err) {
        toast.error('Failed to load clients');
      }
    }
    loadClients();
  }, []);

  useEffect(() => {
    async function loadLedger() {
      if (!selectedClientId) return;
      setLoading(true);
      try {
        const res = await api.get(`/b2b/clients/${selectedClientId}`);
        if (res.success) setClientData(res.data);
      } catch (err) {
        toast.error('Failed to load customer statement');
      } finally {
        setLoading(false);
      }
    }
    loadLedger();
  }, [selectedClientId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Customer Accounts Receivable Ledger</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Statement of Account (SOA), running debit/credit entries, and credit limits</p>
        </div>
        {clientData && (
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Print Official SOA</span>
          </button>
        )}
      </div>

      {user?.role !== 'CLIENT' && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <label className="text-xs font-bold text-slate-700">Select Client Account:</label>
          <select
            value={selectedClientId}
            onChange={e => setSelectedClientId(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-teal-600"
          >
            {clients.map(c => (
              <option key={c.id} value={c.id}>
                {c.company_name} ({c.client_code})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Client Overview Card */}
      {clientData && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs grid grid-cols-1 sm:grid-cols-4 gap-6 text-xs">
          <div>
            <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Client Company</span>
            <strong className="text-base font-black text-slate-900 block mt-1">{clientData.company_name}</strong>
            <p className="text-slate-500 mt-0.5">{clientData.client_code} • {clientData.payment_terms}</p>
          </div>
          <div>
            <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Credit Limit</span>
            <strong className="text-base font-black text-slate-900 block mt-1">{formatCurrency(clientData.credit_limit)}</strong>
            <p className="text-slate-500 mt-0.5">Terms: {clientData.payment_terms}</p>
          </div>
          <div>
            <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Available Credit</span>
            <strong className="text-base font-black text-teal-800 block mt-1">{formatCurrency(clientData.available_credit)}</strong>
            <p className="text-emerald-700 font-bold mt-0.5">Status: {clientData.credit_status}</p>
          </div>
          <div>
            <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Current Outstanding Balance</span>
            <strong className={`text-lg font-black block mt-1 ${Number(clientData.current_balance) > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
              {formatCurrency(clientData.current_balance)}
            </strong>
          </div>
        </div>
      )}

      {/* Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
            Statement of Account (Immutable Ledger Entries)
          </h3>
        </div>
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <th className="py-3 px-4">Transaction Date</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Reference #</th>
              <th className="py-3 px-4">Particulars / Remarks</th>
              <th className="py-3 px-4 text-right">Debit (+)</th>
              <th className="py-3 px-4 text-right">Credit (-)</th>
              <th className="py-3 px-4 text-right">Running Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(!clientData?.ledger || clientData.ledger.length === 0) ? (
              <tr>
                <td colSpan="7" className="py-8 text-center text-slate-400">No transactions posted to this ledger yet.</td>
              </tr>
            ) : (
              clientData.ledger.map(row => (
                <tr key={row.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3.5 px-4 text-slate-600 font-medium">{formatDate(row.transaction_date)}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">{row.transaction_type}</td>
                  <td className="py-3.5 px-4 font-bold text-teal-800">{row.reference_number}</td>
                  <td className="py-3.5 px-4 text-slate-600">{row.remarks}</td>
                  <td className="py-3.5 px-4 text-right font-bold text-rose-600">
                    {Number(row.debit_amount) > 0 ? formatCurrency(row.debit_amount) : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-emerald-700">
                    {Number(row.credit_amount) > 0 ? formatCurrency(row.credit_amount) : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-right font-black text-slate-900 text-sm">
                    {formatCurrency(row.running_balance)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
