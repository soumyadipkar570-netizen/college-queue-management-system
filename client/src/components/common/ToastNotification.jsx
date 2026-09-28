import React from 'react';
import { useSocket } from '../../context/SocketContext';
import { Bell, CheckCircle2, AlertTriangle, X } from 'lucide-react';

const ToastNotification = () => {
  const { activeAlert, clearActiveAlert } = useSocket();

  if (!activeAlert) return null;

  const isCalled = activeAlert.type === 'CALLED';

  return (
    <div className="fixed top-5 right-5 z-50 max-w-md w-full animate-bounce sm:animate-none sm:slide-in-from-top-4 transition-all">
      <div className={`p-4 rounded-xl shadow-2xl border-2 ${
        isCalled
          ? 'bg-blue-600 text-white border-blue-400 ring-4 ring-blue-300 ring-opacity-50'
          : activeAlert.type === 'COMPLETED'
          ? 'bg-emerald-700 text-white border-emerald-500'
          : 'bg-amber-600 text-white border-amber-400'
      }`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-white/20 rounded-lg">
              {isCalled ? (
                <Bell className="w-6 h-6 animate-spin text-yellow-300" />
              ) : activeAlert.type === 'COMPLETED' ? (
                <CheckCircle2 className="w-6 h-6 text-white" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider font-bold opacity-90">
                {activeAlert.title}
              </div>
              <div className="text-2xl font-extrabold tracking-tight font-mono mt-0.5">
                {activeAlert.tokenNumber}
              </div>
              <p className="text-sm font-medium mt-1 opacity-95">
                {activeAlert.message}
              </p>
              {activeAlert.counterName && (
                <div className="mt-2 inline-flex items-center px-2.5 py-1 rounded bg-white text-slate-900 font-bold text-xs shadow">
                  📍 {activeAlert.counterName}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={clearActiveAlert}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ToastNotification;
