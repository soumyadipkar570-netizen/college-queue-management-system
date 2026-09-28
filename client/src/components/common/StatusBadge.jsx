import React from 'react';

const StatusBadge = ({ status, className = '' }) => {
  const normalized = (status || '').toUpperCase();

  switch (normalized) {
    case 'WAITING':
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse"></span>
          Waiting
        </span>
      );

    case 'CALLED':
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300 ring-2 ring-blue-400 ring-offset-1 animate-pulse ${className}`}>
          <span className="w-2 h-2 rounded-full bg-blue-600 mr-1.5"></span>
          CALLED
        </span>
      );

    case 'SERVING':
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5"></span>
          Serving
        </span>
      );

    case 'COMPLETED':
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 ${className}`}>
          ✓ Completed
        </span>
      );

    case 'SKIPPED':
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 ${className}`}>
          Skipped
        </span>
      );

    case 'CANCELLED':
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200 ${className}`}>
          Cancelled
        </span>
      );

    case 'OPEN':
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
          OPEN
        </span>
      );

    case 'CLOSED':
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-300 ${className}`}>
          CLOSED
        </span>
      );

    default:
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 ${className}`}>
          {status}
        </span>
      );
  }
};

export default StatusBadge;
