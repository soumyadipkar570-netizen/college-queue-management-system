import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../api/client';
import Navbar from '../../components/common/Navbar';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import {
  BookOpen,
  CreditCard,
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  XCircle,
  ArrowRight,
  Ticket,
  ChevronRight,
  Calendar,
  Sparkles
} from 'lucide-react';

const StudentDashboard = () => {
  const { user } = useAuth();
  const { lastQueueEvent } = useSocket();

  const [activeTokens, setActiveTokens] = useState([]);
  const [history, setHistory] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Service selection modal state
  const [selectedDept, setSelectedDept] = useState(null);
  const [deptServices, setDeptServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [tokenSuccess, setTokenSuccess] = useState(null);

  // Cancel dialog
  const [tokenToCancel, setTokenToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [generalError, setGeneralError] = useState('');

  const loadData = async () => {
    try {
      setGeneralError('');
      const [tokenRes, histRes, deptRes] = await Promise.all([
        api.get('/tokens/active'),
        api.get('/tokens/history?limit=15'),
        api.get('/departments')
      ]);

      if (tokenRes.success) setActiveTokens(tokenRes.activeTokens || []);
      if (histRes.success) setHistory(histRes.history || []);
      if (deptRes.success) setDepartments(deptRes.departments || []);
    } catch (err) {
      console.error('Failed to load student data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [lastQueueEvent]);

  // Open department modal and fetch its services
  const handleSelectDepartment = async (dept) => {
    setSelectedDept(dept);
    setLoadingServices(true);
    setGeneralError('');
    try {
      const res = await api.get(`/departments/${dept.id}/services`);
      if (res.success) {
        setDeptServices(res.services || []);
      }
    } catch (err) {
      setGeneralError(err.message || 'Could not load department services.');
    } finally {
      setLoadingServices(false);
    }
  };

  // Generate a token for a selected service
  const handleGenerateToken = async (serviceId) => {
    setGeneratingToken(true);
    setGeneralError('');
    try {
      const res = await api.post('/tokens', { serviceId });
      if (res.success) {
        setTokenSuccess(res.token);
        setSelectedDept(null);
        await loadData();
      }
    } catch (err) {
      setGeneralError(err.message || 'Failed to generate token.');
    } finally {
      setGeneratingToken(false);
    }
  };

  // Cancel active token
  const handleConfirmCancel = async () => {
    if (!tokenToCancel) return;
    setCancelling(true);
    try {
      await api.post(`/tokens/${tokenToCancel.id}/cancel`);
      setTokenToCancel(null);
      await loadData();
    } catch (err) {
      setGeneralError(err.message || 'Failed to cancel token.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-900/10 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 text-blue-200 text-xs font-semibold uppercase tracking-wider mb-1">
                <span>Student Queue Portal</span>
                <span>•</span>
                <span>{user?.collegeId || 'STU'}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Welcome, {user?.name || 'Student'}
              </h1>
              <p className="mt-1 text-sm text-blue-100 max-w-xl">
                {user?.course || 'Degree Program'} ({user?.semester || 'Semester'})
              </p>
            </div>
            <button
              onClick={loadData}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-sm transition border border-white/10 self-start md:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Status</span>
            </button>
          </div>
        </div>

        {generalError && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{generalError}</span>
            </div>
            <button
              onClick={() => setGeneralError('')}
              className="text-rose-500 hover:text-rose-700 text-xs font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* ACTIVE TOKENS SECTION */}
        {/* ---------------------------------------------------- */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <Ticket className="w-5 h-5 text-blue-600" />
              <span>Your Active Tokens</span>
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
              {activeTokens.length} Active
            </span>
          </div>

          {activeTokens.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                <Ticket className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No Active Tokens</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                You are currently not queued for any department. Choose a department below to generate a token.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeTokens.map((tok) => {
                const isLib = tok.department_code === 'LIB';
                const isCalled = tok.status === 'CALLED';
                const isServing = tok.status === 'SERVING';

                return (
                  <div
                    key={tok.id}
                    className={`rounded-3xl p-6 border shadow-lg transition-all relative overflow-hidden ${
                      isCalled
                        ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-400 ring-4 ring-blue-300 ring-opacity-50 animate-token-glow'
                        : isServing
                        ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-400'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className={`p-2 rounded-xl text-white ${isLib ? 'bg-emerald-600' : 'bg-indigo-600'}`}>
                          {isLib ? <BookOpen className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            {tok.department_name}
                          </div>
                          <div className="text-sm font-bold text-slate-900">{tok.service_name}</div>
                        </div>
                      </div>
                      <StatusBadge status={tok.status} />
                    </div>

                    {/* Token Number Display */}
                    <div className="mt-5 text-center py-4 bg-white/80 rounded-2xl border border-slate-100 shadow-sm">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                        Token Number
                      </span>
                      <div className="text-4xl sm:text-5xl font-extrabold font-mono text-slate-900 tracking-tight mt-0.5">
                        {tok.token_number}
                      </div>
                    </div>

                    {/* Notification Call Banner */}
                    {isCalled && (
                      <div className="mt-4 p-3.5 bg-blue-600 text-white rounded-2xl text-center shadow-md animate-bounce">
                        <div className="text-xs font-bold uppercase tracking-wider">🔔 Your Turn Has Arrived!</div>
                        <div className="text-base font-extrabold mt-0.5">
                          Please proceed to: {tok.counter_name || 'Assigned Counter'}
                        </div>
                      </div>
                    )}

                    {isServing && (
                      <div className="mt-4 p-3 bg-emerald-600 text-white rounded-2xl text-center shadow-sm">
                        <div className="text-xs font-bold uppercase tracking-wider">⚡ In Progress</div>
                        <div className="text-sm font-semibold mt-0.5">
                          Being served at {tok.counter_name || 'Desk'}
                        </div>
                      </div>
                    )}

                    {/* Queue Position and Wait Estimate */}
                    {tok.status === 'WAITING' && (
                      <div className="grid grid-cols-2 gap-3 mt-4">
                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                          <div className="flex items-center justify-center space-x-1 text-slate-500 text-xs mb-1">
                            <Users className="w-3.5 h-3.5" />
                            <span>People Ahead</span>
                          </div>
                          <div className="text-2xl font-black text-slate-800">
                            {tok.peopleAhead}
                          </div>
                        </div>

                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                          <div className="flex items-center justify-center space-x-1 text-slate-500 text-xs mb-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Approx. Wait</span>
                          </div>
                          <div className="text-2xl font-black text-slate-800">
                            ~{tok.estimatedWaitMinutes} <span className="text-xs font-medium text-slate-500">min</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Footer Info & Cancel Button */}
                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div className="text-slate-500">
                        Current serving: <strong className="text-slate-800 font-mono">{tok.currentServingToken}</strong>
                      </div>

                      {tok.status === 'WAITING' && (
                        <button
                          type="button"
                          onClick={() => setTokenToCancel(tok)}
                          className="text-rose-600 hover:text-rose-800 font-semibold hover:underline flex items-center space-x-1"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Cancel Token</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ---------------------------------------------------- */}
        {/* CHOOSE DEPARTMENT SECTION (SECTION 6 OF SPEC) */}
        {/* ---------------------------------------------------- */}
        <div>
          <div className="mb-4">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Choose Department
            </h2>
            <p className="text-xs text-slate-500">
              Select a college office to browse available counters and get your queue token
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {departments.map((dept) => {
              const isLib = dept.code === 'LIB';
              // Check if user already has an active token in this department
              const hasActiveInDept = activeTokens.some((t) => t.department_id === dept.id);

              return (
                <div
                  key={dept.id}
                  className={`rounded-3xl p-6 sm:p-8 bg-white border border-slate-200/80 shadow-md hover:shadow-xl transition-all relative overflow-hidden flex flex-col justify-between group`}
                >
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${
                        isLib
                          ? 'bg-gradient-to-tr from-emerald-600 to-green-500 shadow-emerald-600/20'
                          : 'bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-indigo-600/20'
                      }`}>
                        {isLib ? <BookOpen className="w-7 h-7" /> : <CreditCard className="w-7 h-7" />}
                      </div>

                      <div className="text-right">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          dept.open_counters_count > 0
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {dept.open_counters_count} Active {dept.open_counters_count === 1 ? 'Counter' : 'Counters'}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-xl font-extrabold text-slate-900 group-hover:text-blue-600 transition">
                      {isLib ? '📚 College Library' : '💳 Fees Payment Office'}
                    </h3>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                      {dept.description || (isLib ? 'Manage book issue, return, renewal, and queries' : 'Tuition fees, receipts, payment verification, dues, and scholarships')}
                    </p>

                    <div className="mt-4 flex items-center space-x-4 text-xs text-slate-500">
                      <div>
                        <strong>{dept.services_count || 5}</strong> Services
                      </div>
                      <div>•</div>
                      <div>
                        <strong>{dept.waitingCount || 0}</strong> Students in line
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100">
                    {hasActiveInDept ? (
                      <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs font-medium text-center">
                        ⚠️ You already have an active token in this department.
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSelectDepartment(dept)}
                        className={`w-full py-3 px-4 rounded-xl text-white font-bold text-sm shadow-md transition flex items-center justify-center space-x-2 ${
                          isLib
                            ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                            : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                        }`}
                      >
                        <span>{isLib ? 'Enter Library' : 'Enter Fees Office'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* TOKEN HISTORY TABLE */}
        {/* ---------------------------------------------------- */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-slate-500" />
                <span>Your Token History</span>
              </h3>
              <p className="text-xs text-slate-500">Past completed, cancelled or skipped tokens</p>
            </div>
          </div>

          {history.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              No historical tokens found for your account.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-3">Token</th>
                    <th className="py-3 px-3">Department</th>
                    <th className="py-3 px-3">Service</th>
                    <th className="py-3 px-3">Counter</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        {h.token_number}
                      </td>
                      <td className="py-3 px-3 text-slate-700">{h.department_name}</td>
                      <td className="py-3 px-3 font-medium text-slate-800">{h.service_name}</td>
                      <td className="py-3 px-3 text-slate-600">{h.counter_name || '—'}</td>
                      <td className="py-3 px-3">
                        <StatusBadge status={h.status} />
                        {h.skip_reason && (
                          <div className="text-[10px] text-rose-600 mt-0.5 italic">
                            Reason: {h.skip_reason}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        {new Date(h.created_at).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ---------------------------------------------------- */}
      {/* SERVICE SELECTION MODAL */}
      {/* ---------------------------------------------------- */}
      <Modal
        isOpen={!!selectedDept}
        onClose={() => setSelectedDept(null)}
        title={selectedDept ? `${selectedDept.name} — Select Service` : 'Select Service'}
        maxWidth="max-w-xl"
      >
        {loadingServices ? (
          <div className="py-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-sm">Loading services and current wait times...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Pick the specific service you need. A digital token will be issued and placed into the FIFO queue.
            </p>

            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {deptServices.map((svc) => (
                <div
                  key={svc.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 transition group"
                >
                  <div className="flex-1 pr-4">
                    <div className="font-bold text-sm text-slate-900">{svc.name}</div>
                    <div className="flex items-center space-x-3 mt-1 text-xs text-slate-500">
                      <span>Prefix: <strong className="font-mono text-slate-700">{svc.token_prefix}</strong></span>
                      <span>•</span>
                      <span>Waiting: <strong className="text-slate-700">{svc.waiting_tokens_count || 0}</strong></span>
                      <span>•</span>
                      <span>
                        Approx. Wait: <strong className="text-blue-700">~{svc.estimatedWaitMinutes || 0} min</strong>
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={generatingToken}
                    onClick={() => handleGenerateToken(svc.id)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition shrink-0 disabled:opacity-50"
                  >
                    {generatingToken ? 'Issuing...' : 'Get Token'}
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDept(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ---------------------------------------------------- */}
      {/* TOKEN SUCCESS CONFIRMATION MODAL */}
      {/* ---------------------------------------------------- */}
      <Modal
        isOpen={!!tokenSuccess}
        onClose={() => setTokenSuccess(null)}
        title="Digital Token Generated"
        maxWidth="max-w-md"
      >
        {tokenSuccess && (
          <div className="text-center py-2 space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8" />
            </div>

            <div>
              <div className="text-xs uppercase font-bold text-slate-400">Your Token Number</div>
              <div className="text-5xl font-black font-mono text-slate-900 mt-1">
                {tokenSuccess.tokenNumber}
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1.5 text-left">
              <div className="flex justify-between">
                <span className="text-slate-500">Department:</span>
                <span className="font-bold text-slate-800">{tokenSuccess.departmentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Service:</span>
                <span className="font-bold text-slate-800">{tokenSuccess.serviceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">People Ahead:</span>
                <span className="font-bold text-slate-800">{tokenSuccess.peopleAhead}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Approx. Waiting Time:</span>
                <span className="font-bold text-blue-700">~{tokenSuccess.estimatedWaitMinutes} minutes</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 italic">
              Please keep this page open. You will receive an immediate live audio and visual alert when your token is called.
            </p>

            <button
              type="button"
              onClick={() => setTokenSuccess(null)}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition"
            >
              Done & Track Queue
            </button>
          </div>
        )}
      </Modal>

      {/* ---------------------------------------------------- */}
      {/* CANCEL TOKEN CONFIRM DIALOG */}
      {/* ---------------------------------------------------- */}
      <ConfirmDialog
        isOpen={!!tokenToCancel}
        onClose={() => setTokenToCancel(null)}
        onConfirm={handleConfirmCancel}
        isLoading={cancelling}
        isDestructive={true}
        title="Cancel Active Token"
        message={`Are you sure you want to cancel Token [${tokenToCancel?.token_number}] for ${tokenToCancel?.service_name}? You will forfeit your position in the FIFO queue.`}
        confirmText="Yes, Cancel Token"
      />
    </div>
  );
};

export default StudentDashboard;
