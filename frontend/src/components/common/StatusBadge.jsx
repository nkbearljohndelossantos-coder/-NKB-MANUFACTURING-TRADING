import React from 'react';

export default function StatusBadge({ status, type = 'order' }) {
  const norm = String(status || '').trim();

  let styles = 'bg-slate-100 text-slate-700 border-slate-200';

  if (['Delivered', 'Completed', 'Approved', 'Paid', 'Good'].includes(norm)) {
    styles = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (['Confirmed', 'Ready for Delivery', 'Partially Paid', 'Require Approval'].includes(norm)) {
    styles = 'bg-sky-50 text-sky-700 border-sky-200';
  } else if (['Submitted', 'Preparing', 'Pending Approval', 'Pending', 'Warning'].includes(norm)) {
    styles = 'bg-amber-50 text-amber-800 border-amber-200';
  } else if (['Variance Detected', 'Over-Delivery', 'Overdue', 'Blocked', 'Rejected', 'Cancelled'].includes(norm)) {
    styles = 'bg-rose-50 text-rose-700 border-rose-200 font-bold animate-pulse';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles}`}>
      {norm || 'N/A'}
    </span>
  );
}
