import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../api/client';
import Navbar from '../common/Navbar';
import StatusBadge from '../common/StatusBadge';
import SkipReasonModal from '../common/SkipReasonModal';
import ConfirmDialog from '../common/ConfirmDialog';
import {
  PhoneCall,
  RotateCcw,
  Play,
  CheckCircle2,
  UserX,
  Power,
  Users,
  Clock,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Building2
} from 'lucide-react';

const CounterDashboardView = ({ departmentType = 'LIBRARY' }) => {
  const { user } = useAuth();
  const { lastQueueEvent } = useSocket();

  const isLibrary = departmentType === 'LIBRARY';
  const deptTitle = isLibrary ? 'College Library' : 'Fees Payment Office';
  const themeColor = isLibrary ? 'emerald' : 'indigo';

  const [counter, setCounter] = useState(null);
  const [currentToken, setCurrentToken] = useState(null);
  const [waitingQueue, setWaitingQueue] = useState([]);
  const [stats, setStats] = useState({
    completedToday: 0,
    skippedToday: 0,
    servingNow: 0,
    avgServiceMinutes: 0
  });

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Skip modal
  const [isSkipModalOpen, setIsSkipModalOpen] = useState(false);

  // Complete confirm dialog
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setErrorMessage('');
      const res = await api.get('/staff/assigned-counter');
      if (res.success && res.counter) {
        setCounter(res.counter);
        setCurrentToken(res.currentToken || null);
        setWaitingQueue(res.waitingQueue || []);

        // Fetch counter statistics
        const statsRes = await api.get(`/counters/${res.counter.id}/stats`);
        if (statsRes.success) {
          setStats(statsRes.stats);
        }
      }
    } catch (err) {
      console.error('Failed to load counter data:', err);
      setErrorMessage(err.message || 'Failed to fetch assigned counter data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [lastQueueEvent]);

  // Toggle Counter Open / Closed
  const handleToggleStatus = async () => {
    if (!counter) return;
    const newStatus = counter.status === 'OPEN' ? 'CLOSED' : 'OPEN';
    setActionLoading(true);
    setErrorMessage('');
    try {
      await api.post(`/counters/${counter.id}/toggle-status`, { status: newStatus });
      setCounter((prev) => ({ ...prev, status: newStatus }));
      setSuccessMessage(`Counter status changed to ${newStatus}.`);
      await fetchDashboardData();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to toggle counter status.');
    } finally {
      setActionLoading(false);
    }
  };

  // Call Next Token
  const handleCallNext = async () => {
    if (!counter) return;
    setActionLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await api.post(`/counters/${counter.id}/call-next`);
      if (res.success) {
        if (res.token) {
          setCurrentToken(res.token);
          setSuccessMessage(res.message);
        } else {
          setSuccessMessage('No waiting tokens in queue at this time.');
        }
        await fetchDashboardData();
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to call next token.');
    } finally {
      setActionLoading(false);
    }
  };

  // Recall Token
  const handleRecall = async () => {
    if (!currentToken) return;
    setActionLoading(true);
    setErrorMessage('');
    try {
      const res = await api.post(`/tokens/${currentToken.id}/recall`);
      if (res.success) {
        setSuccessMessage(`Re-called token ${currentToken.tokenNumber || currentToken.token_number}. Notification sent to student.`);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to recall token.');
    } finally {
      setActionLoading(false);
    }
  };

  // Start Serving
  const handleStartServing = async () => {
    if (!currentToken) return;
    setActionLoading(true);
    setErrorMessage('');
    try {
      const res = await api.post(`/tokens/${currentToken.id}/serve`);
      if (res.success) {
        setCurrentToken((prev) => ({ ...prev, status: 'SERVING' }));
        setSuccessMessage(`Started serving token ${currentToken.tokenNumber || currentToken.token_number}.`);
        await fetchDashboardData();
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to start serving.');
    } finally {
      setActionLoading(false);
    }
  };

  // Complete Service
  const handleConfirmComplete = async () => {
    if (!currentToken) return;
    setActionLoading(true);
    setErrorMessage('');
    try {
      const res = await api.post(`/tokens/${currentToken.id}/complete`);
      if (res.success) {
        setIsCompleteDialogOpen(false);
        setCurrentToken(null);
        setSuccessMessage(`Token successfully completed!`);
        await fetchDashboardData();
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to complete token.');
    } finally {
      setActionLoading(false);
    }
  };

  // Skip Token
  const handleConfirmSkip = async (reason) => {
    if (!currentToken) return;
    setActionLoading(true);
    setErrorMessage('');
    try {
      const res = await api.post(`/tokens/${currentToken.id}/skip`, { reason });
      if (res.success) {
        setIsSkipModalOpen(false);
        setCurrentToken(null);
        setSuccessMessage(`Token skipped: ${reason}`);
        await fetchDashboardData();
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to skip token.');
    } finally {
      setActionLoading(false);
    }
  };

  const isCounterOpen = counter?.status === 'OPEN';
  const hasCurrentToken = !!currentToken;
  const isCalledState = currentToken?.status === 'CALLED';
  const isServingState = currentToken?.status === 'SERVING';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Top Header Card */}
        <div className={`rounded-3xl p-6 sm:p-8 text-white shadow-xl ${
          isLibrary
            ? 'bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 shadow-emerald-900/10'
            : 'bg-gradient-to-r from-indigo-800 via-purple-800 to-indigo-900 shadow-indigo-900/10'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 text-white/80 text-xs font-bold uppercase tracking-wider mb-1">
                <span>Staff Counter Dashboard</span>
                <span>•</span>
                <span>{deptTitle}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {counter?.counter_name || 'Counter Terminal'}
              </h1>
              <p className="mt-1 text-sm text-white/90">
                Logged in as <strong>{user?.name}</strong> ({user?.employeeId})
              </p>
            </div>

            {/* Counter Open/Closed Toggle */}
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full text-xs font-black tracking-wider ${
                isCounterOpen ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30' : 'bg-rose-400/20 text-rose-300 border border-rose-400/30'
              }`}>
                {isCounterOpen ? '● COUNTER OPEN' : '○ COUNTER CLOSED'}
              </span>

              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={actionLoading}
                className={`inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition disabled:opacity-50 ${
                  isCounterOpen
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-slate-900'
                }`}
              >
                <Power className="w-4 h-4" />
                <span>{isCounterOpen ? 'Close Counter' : 'Open Counter'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Message Alerts */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage('')} className="text-xs font-bold text-rose-600">Dismiss</button>
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage('')} className="text-xs font-bold text-emerald-600">Dismiss</button>
          </div>
        )}

        {/* Main Grid: Left is Counter Terminal, Right is Waiting Queue & Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: ACTIVE TOKEN CONSOLE (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Current Serving Token</h2>
                  <p className="text-xs text-slate-500">Live student ticket at your counter</p>
                </div>
                {currentToken && <StatusBadge status={currentToken.status} />}
              </div>

              {!currentToken ? (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <Clock className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-bold text-slate-700">Counter is Currently Idle</h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 mb-6">
                    {isCounterOpen
                      ? 'No token is being served right now. Click "Call Next" to summon the next student from queue.'
                      : 'Counter is CLOSED. Please open counter to call next token.'}
                  </p>

                  <button
                    type="button"
                    onClick={handleCallNext}
                    disabled={!isCounterOpen || actionLoading || waitingQueue.length === 0}
                    className={`inline-flex items-center space-x-2 px-6 py-3.5 rounded-2xl text-white font-extrabold text-sm shadow-xl transition disabled:opacity-40 disabled:cursor-not-allowed ${
                      isLibrary
                        ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                        : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30'
                    }`}
                  >
                    <PhoneCall className="w-5 h-5" />
                    <span>CALL NEXT TOKEN ({waitingQueue.length})</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Token Big Display Card */}
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white text-center shadow-lg relative overflow-hidden">
                    <span className="text-xs uppercase font-extrabold tracking-widest text-slate-400">
                      Now Serving
                    </span>
                    <div className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-white mt-1">
                      {currentToken.token_number || currentToken.tokenNumber}
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-700/60 grid grid-cols-2 gap-2 text-left text-xs">
                      <div>
                        <span className="text-slate-400 block">Service:</span>
                        <strong className="text-slate-200">{currentToken.service_name || currentToken.serviceName}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Student:</span>
                        <strong className="text-slate-200">{currentToken.student_name || currentToken.studentName}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">College ID:</span>
                        <span className="text-slate-300 font-mono">{currentToken.student_college_id || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Course / Sem:</span>
                        <span className="text-slate-300">{currentToken.course || 'Degree'} ({currentToken.semester || '—'})</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {/* Recall */}
                    <button
                      type="button"
                      onClick={handleRecall}
                      disabled={actionLoading}
                      title="Re-notify student with chime alert"
                      className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-slate-700 hover:text-blue-700 transition"
                    >
                      <RotateCcw className="w-5 h-5 mb-1" />
                      <span className="text-xs font-bold">RECALL</span>
                    </button>

                    {/* Start Serving */}
                    <button
                      type="button"
                      onClick={handleStartServing}
                      disabled={actionLoading || isServingState}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border transition ${
                        isServingState
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800 opacity-60 cursor-not-allowed'
                          : 'border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 text-slate-700 hover:text-emerald-700'
                      }`}
                    >
                      <Play className="w-5 h-5 mb-1" />
                      <span className="text-xs font-bold">
                        {isServingState ? 'SERVING...' : 'START SERVING'}
                      </span>
                    </button>

                    {/* Complete */}
                    <button
                      type="button"
                      onClick={() => setIsCompleteDialogOpen(true)}
                      disabled={actionLoading}
                      className="flex flex-col items-center justify-center p-3 rounded-xl border border-emerald-300 bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm shadow-emerald-600/20"
                    >
                      <CheckCircle2 className="w-5 h-5 mb-1" />
                      <span className="text-xs font-bold">COMPLETE</span>
                    </button>

                    {/* Skip */}
                    <button
                      type="button"
                      onClick={() => setIsSkipModalOpen(true)}
                      disabled={actionLoading}
                      className="flex flex-col items-center justify-center p-3 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition"
                    >
                      <UserX className="w-5 h-5 mb-1" />
                      <span className="text-xs font-bold">SKIP</span>
                    </button>
                  </div>

                  {/* Call Next Button (when ready for next) */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleCallNext}
                      disabled={!isCounterOpen || actionLoading || waitingQueue.length === 0}
                      className="w-full py-3 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center justify-center space-x-2 transition disabled:opacity-40"
                    >
                      <PhoneCall className="w-4 h-4" />
                      <span>COMPLETE & CALL NEXT ({waitingQueue.length} Waiting)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: WAITING QUEUE & STATS (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Today's Stats Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm text-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Completed Today</span>
                <div className="text-2xl font-black text-emerald-600 mt-1">{stats.completedToday}</div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm text-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Skipped Today</span>
                <div className="text-2xl font-black text-rose-600 mt-1">{stats.skippedToday}</div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm text-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Waiting in Queue</span>
                <div className="text-2xl font-black text-blue-600 mt-1">{waitingQueue.length}</div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm text-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Avg Service Time</span>
                <div className="text-2xl font-black text-slate-800 mt-1">
                  {stats.avgServiceMinutes} <span className="text-xs font-normal text-slate-400">min</span>
                </div>
              </div>
            </div>

            {/* Waiting Queue List */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-slate-600" />
                  <h3 className="font-bold text-slate-900 text-sm">Upcoming FIFO Queue</h3>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                  {waitingQueue.length} Students
                </span>
              </div>

              {waitingQueue.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No students currently waiting for this counter.
                </div>
              ) : (
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {waitingQueue.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-slate-100/80 transition flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="w-5 text-center font-bold text-slate-400">
                          #{idx + 1}
                        </span>
                        <div>
                          <div className="font-mono font-bold text-slate-900 text-sm">
                            {item.token_number}
                          </div>
                          <div className="text-slate-500 text-[11px]">
                            {item.student_name} • {item.service_name}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400">
                          {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Complete Confirmation Modal */}
      <ConfirmDialog
        isOpen={isCompleteDialogOpen}
        onClose={() => setIsCompleteDialogOpen(false)}
        onConfirm={handleConfirmComplete}
        isLoading={actionLoading}
        title="Complete Token Service"
        message={`Mark Token [${currentToken?.token_number || currentToken?.tokenNumber}] as COMPLETED? This will record the completion timestamp and move the queue forward.`}
        confirmText="Confirm Complete"
      />

      {/* Skip Reason Modal */}
      <SkipReasonModal
        isOpen={isSkipModalOpen}
        onClose={() => setIsSkipModalOpen(false)}
        onConfirm={handleConfirmSkip}
        tokenNumber={currentToken?.token_number || currentToken?.tokenNumber}
        isLoading={actionLoading}
      />
    </div>
  );
};

export default CounterDashboardView;
