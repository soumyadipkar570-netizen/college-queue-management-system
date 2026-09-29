import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../api/client';
import Navbar from '../../components/common/Navbar';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import {
  LayoutDashboard,
  FileSpreadsheet,
  Settings,
  Users,
  Building2,
  Layers,
  History,
  Download,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  UserX,
  Filter,
  Check,
  ChevronRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

const COLORS = ['#1d4ed8', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const AdminDashboard = () => {
  const { user } = useAuth();
  const { lastQueueEvent } = useSocket();

  const [activeTab, setActiveTab] = useState('analytics'); // analytics, reports, services, counters, staff, settings, audit
  const [filterRange, setFilterRange] = useState('today');
  const [selectedDept, setSelectedDept] = useState('ALL');

  // Analytics data
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  // Reports data
  const [reportRecords, setReportRecords] = useState([]);
  const [reportTotal, setReportTotal] = useState(0);
  const [reportStatus, setReportStatus] = useState('ALL');

  // Services & Counters data
  const [services, setServices] = useState([]);
  const [counters, setCounters] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [settings, setSettings] = useState([]);

  // Modals state
  const [isAddServiceModal, setIsAddServiceModal] = useState(false);
  const [newService, setNewService] = useState({ departmentId: 1, name: '', tokenPrefix: 'LIB', avgServiceMinutes: 5 });

  const [isAddCounterModal, setIsAddCounterModal] = useState(false);
  const [newCounter, setNewCounter] = useState({ departmentId: 1, counterName: '' });

  const [isAssignStaffModal, setIsAssignStaffModal] = useState(false);
  const [assignData, setAssignData] = useState({ staffId: '', counterId: '' });

  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch Analytics
  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const res = await api.get(`/admin/analytics?range=${filterRange}&departmentId=${selectedDept}`);
      if (res.success) {
        setAnalyticsData(res);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Fetch Reports
  const fetchReports = async () => {
    try {
      const res = await api.get(`/admin/reports?departmentId=${selectedDept}&status=${reportStatus}&limit=50`);
      if (res.success) {
        setReportRecords(res.records || []);
        setReportTotal(res.totalRecords || 0);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    }
  };

  // Fetch Services & Counters
  const fetchManagementData = async () => {
    try {
      const [svcRes, cntRes, stfRes, stuRes, setRes, audRes] = await Promise.all([
        api.get('/admin/services'),
        api.get('/admin/counters'),
        api.get('/admin/staff'),
        api.get('/admin/students'),
        api.get('/admin/settings'),
        api.get('/admin/audit-logs?limit=40')
      ]);

      if (svcRes.success) setServices(svcRes.services || []);
      if (cntRes.success) setCounters(cntRes.counters || []);
      if (stfRes.success) setStaffList(stfRes.staff || []);
      if (stuRes.success) setStudentsList(stuRes.students || []);
      if (setRes.success) setSettings(setRes.settings || []);
      if (audRes.success) setAuditLogs(audRes.logs || []);
    } catch (err) {
      console.error('Failed to load management data:', err);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    if (activeTab === 'reports') fetchReports();
    if (['services', 'counters', 'staff', 'settings', 'audit'].includes(activeTab)) {
      fetchManagementData();
    }
  }, [activeTab, filterRange, selectedDept, reportStatus, lastQueueEvent]);

  // Export CSV
  const handleExportCSV = () => {
    const url = `/api/admin/reports?departmentId=${selectedDept}&status=${reportStatus}&format=csv`;
    window.open(url, '_blank');
  };

  // Handle Add Service
  const handleCreateService = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/services', newService);
      setIsAddServiceModal(false);
      setNewService({ departmentId: 1, name: '', tokenPrefix: 'LIB', avgServiceMinutes: 5 });
      setStatusMessage('Service created successfully!');
      fetchManagementData();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to create service.');
    }
  };

  // Handle Add Counter
  const handleCreateCounter = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/counters', newCounter);
      setIsAddCounterModal(false);
      setNewCounter({ departmentId: 1, counterName: '' });
      setStatusMessage('Counter created successfully!');
      fetchManagementData();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to create counter.');
    }
  };

  // Handle Assign Staff
  const handleAssignStaff = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/counters/assign', assignData);
      setIsAssignStaffModal(false);
      setStatusMessage('Staff assigned to counter successfully!');
      fetchManagementData();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to assign staff.');
    }
  };

  // Toggle Counter Status
  const handleToggleCounter = async (counter) => {
    const newStatus = counter.status === 'OPEN' ? 'CLOSED' : 'OPEN';
    try {
      await api.post(`/counters/${counter.id}/toggle-status`, { status: newStatus });
      fetchManagementData();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to toggle counter.');
    }
  };

  const kpis = analyticsData?.kpis || {
    totalTokens: 0,
    waitingNow: 0,
    servingNow: 0,
    completedToday: 0,
    skippedToday: 0,
    cancelledToday: 0,
    avgWaitMinutes: 0,
    avgServiceMinutes: 0,
    completionRate: 0
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Admin Header */}
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-purple-300 mb-1">
              Central Administration Console
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              CQMS Analytics & Management
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              Live monitoring, queue configurations, and reports for Library & Fees Payment Office
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                fetchAnalytics();
                fetchReports();
                fetchManagementData();
              }}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition backdrop-blur-sm border border-white/10"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Live Data</span>
            </button>
          </div>
        </div>

        {/* Global Feedback Banners */}
        {statusMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{statusMessage}</span>
            </div>
            <button onClick={() => setStatusMessage('')} className="text-xs font-bold text-emerald-600">Dismiss</button>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage('')} className="text-xs font-bold text-rose-600">Dismiss</button>
          </div>
        )}

        {/* Nav Tabs */}
        <div className="flex space-x-1 sm:space-x-2 border-b border-slate-200 overflow-x-auto pb-1 text-xs sm:text-sm font-bold">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2.5 rounded-xl transition flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Analytics & KPIs</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2.5 rounded-xl transition flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'reports'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Queue History & Reports</span>
          </button>

          <button
            onClick={() => setActiveTab('services')}
            className={`px-4 py-2.5 rounded-xl transition flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'services'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Services</span>
          </button>

          <button
            onClick={() => setActiveTab('counters')}
            className={`px-4 py-2.5 rounded-xl transition flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'counters'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Counters & Staff</span>
          </button>

          <button
            onClick={() => setActiveTab('staff')}
            className={`px-4 py-2.5 rounded-xl transition flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'staff'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Students & Staff</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2.5 rounded-xl transition flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Queue Rules</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2.5 rounded-xl transition flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'audit'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Audit Trail</span>
          </button>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* TAB 1: ANALYTICS & CHARTS */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Filters bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Time Filter:</span>
                {['today', 'week', 'month'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setFilterRange(r)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition ${
                      filterRange === r
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {r === 'today' ? 'Today' : r === 'week' ? 'Past 7 Days' : 'Past 30 Days'}
                  </button>
                ))}
              </div>

              <div className="flex items-center space-x-3 text-xs">
                <span className="font-bold text-slate-700">Department:</span>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none"
                >
                  <option value="ALL">All Departments</option>
                  <option value="1">College Library (LIB)</option>
                  <option value="2">Fees Payment Office (FEE)</option>
                </select>
              </div>
            </div>

            {/* KPI Cards Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm text-center">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Total Tokens</span>
                <div className="text-2xl font-black text-slate-900 mt-1">{kpis.totalTokens}</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm text-center">
                <span className="text-[10px] font-extrabold uppercase text-amber-500 block">Waiting Now</span>
                <div className="text-2xl font-black text-amber-600 mt-1">{kpis.waitingNow}</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm text-center">
                <span className="text-[10px] font-extrabold uppercase text-blue-500 block">Serving Now</span>
                <div className="text-2xl font-black text-blue-600 mt-1">{kpis.servingNow}</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm text-center">
                <span className="text-[10px] font-extrabold uppercase text-emerald-500 block">Completed</span>
                <div className="text-2xl font-black text-emerald-600 mt-1">{kpis.completedToday}</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm text-center">
                <span className="text-[10px] font-extrabold uppercase text-rose-500 block">Skipped</span>
                <div className="text-2xl font-black text-rose-600 mt-1">{kpis.skippedToday}</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm text-center">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Cancelled</span>
                <div className="text-2xl font-black text-slate-600 mt-1">{kpis.cancelledToday}</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm text-center">
                <span className="text-[10px] font-extrabold uppercase text-slate-500 block">Avg Wait</span>
                <div className="text-2xl font-black text-slate-800 mt-1">
                  ~{kpis.avgWaitMinutes} <span className="text-[10px] text-slate-400 font-normal">min</span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm text-center">
                <span className="text-[10px] font-extrabold uppercase text-slate-500 block">Completion %</span>
                <div className="text-2xl font-black text-purple-700 mt-1">{kpis.completionRate}%</div>
              </div>
            </div>

            {/* Department Breakdown Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {analyticsData?.departmentBreakdown?.map((dept) => {
                const isLib = dept.code === 'LIB';
                return (
                  <div key={dept.id} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2.5">
                        <div className={`p-2.5 rounded-xl text-white ${isLib ? 'bg-emerald-600' : 'bg-indigo-600'}`}>
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-base text-slate-900">{dept.name}</h3>
                          <span className="text-xs font-mono text-slate-400">Prefix: {dept.code}</span>
                        </div>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                        {dept.total_tokens || 0} Total Tokens
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2.5 bg-amber-50 rounded-xl">
                        <span className="text-amber-700 font-bold block">Waiting</span>
                        <span className="text-lg font-black text-amber-800">{dept.waiting_count || 0}</span>
                      </div>
                      <div className="p-2.5 bg-emerald-50 rounded-xl">
                        <span className="text-emerald-700 font-bold block">Completed</span>
                        <span className="text-lg font-black text-emerald-800">{dept.completed_count || 0}</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl">
                        <span className="text-slate-600 font-bold block">Avg Duration</span>
                        <span className="text-lg font-black text-slate-800">{dept.avg_service_minutes || 0}m</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recharts Analytics Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart 1: Hourly Queue Distribution (Peak Period) */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Hourly Traffic & Peak Queue Period</h3>
                    <p className="text-xs text-slate-500">Distribution of tokens issued throughout the day</p>
                  </div>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData?.hourlyDistribution || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="tokens" name="Tokens Issued" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Daily Trends (7 Days) */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">7-Day Volume Trend</h3>
                    <p className="text-xs text-slate-500">Daily total tokens vs completed services</p>
                  </div>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analyticsData?.dailyTrends || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date_label" tick={{ fontSize: 10 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="total" name="Total Issued" stroke="#7c3aed" fill="#ede9fe" />
                      <Area type="monotone" dataKey="completed" name="Completed" stroke="#059669" fill="#d1fae5" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 3: Counter Performance */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Counter Performance</h3>
                    <p className="text-xs text-slate-500">Students served and average minutes per counter</p>
                  </div>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData?.counterPerformance || []} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis dataKey="counter_name" type="category" width={110} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="served_count" name="Served" fill="#059669" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 4: Service Volume Breakdown */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Service Category Popularity</h3>
                    <p className="text-xs text-slate-500">Volume breakdown by service</p>
                  </div>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analyticsData?.serviceStats || []}
                        dataKey="total_requests"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) => `${name.substring(0, 12)} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {(analyticsData?.serviceStats || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 2: QUEUE HISTORY & REPORTS */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'reports' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Queue History & Reports</h2>
                <p className="text-xs text-slate-500">Comprehensive database of tokens, timestamps and counter logs</p>
              </div>

              <div className="flex items-center space-x-3">
                <select
                  value={reportStatus}
                  onChange={(e) => setReportStatus(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="WAITING">WAITING</option>
                  <option value="CALLED">CALLED</option>
                  <option value="SERVING">SERVING</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="SKIPPED">SKIPPED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>

                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Export to CSV</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-3">Token</th>
                    <th className="py-3 px-3">Department</th>
                    <th className="py-3 px-3">Service</th>
                    <th className="py-3 px-3">Student</th>
                    <th className="py-3 px-3">Counter</th>
                    <th className="py-3 px-3">Staff</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Wait (min)</th>
                    <th className="py-3 px-3">Service (min)</th>
                    <th className="py-3 px-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportRecords.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="py-8 text-center text-slate-400">
                        No records matching filter criteria.
                      </td>
                    </tr>
                  ) : (
                    reportRecords.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">{r.token_number}</td>
                        <td className="py-3 px-3 text-slate-600">{r.department_name}</td>
                        <td className="py-3 px-3 font-medium text-slate-800">{r.service_name}</td>
                        <td className="py-3 px-3 text-slate-700">
                          <div>{r.student_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{r.student_college_id}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-600">{r.counter_name || '—'}</td>
                        <td className="py-3 px-3 text-slate-600">{r.staff_name || '—'}</td>
                        <td className="py-3 px-3">
                          <StatusBadge status={r.status} />
                          {r.skip_reason && (
                            <div className="text-[10px] text-rose-600 italic">
                              {r.skip_reason}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600">
                          {r.wait_duration_minutes !== null ? `${r.wait_duration_minutes}m` : '—'}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600">
                          {r.service_duration_minutes !== null ? `${r.service_duration_minutes}m` : '—'}
                        </td>
                        <td className="py-3 px-3 text-slate-400 text-[11px]">
                          {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 3: SERVICES MANAGEMENT */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'services' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Configured Services</h2>
                <p className="text-xs text-slate-500">Manage queue services for Library and Fees Payment Office</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddServiceModal(true)}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Service</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-3">Service Name</th>
                    <th className="py-3 px-3">Department</th>
                    <th className="py-3 px-3">Token Prefix</th>
                    <th className="py-3 px-3">Avg Service Time</th>
                    <th className="py-3 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {services.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-3 font-bold text-slate-900">{s.name}</td>
                      <td className="py-3 px-3 text-slate-600">{s.department_name}</td>
                      <td className="py-3 px-3 font-mono font-bold text-blue-700">{s.token_prefix}</td>
                      <td className="py-3 px-3 text-slate-700">{s.avg_service_minutes} minutes</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          s.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 4: COUNTERS & STAFF ASSIGNMENTS */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'counters' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Counters & Staff Assignment</h2>
                <p className="text-xs text-slate-500">Configure physical counters and assign staff operators</p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAssignStaffModal(true)}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition"
                >
                  <Users className="w-4 h-4" />
                  <span>Assign Staff</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsAddCounterModal(true)}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Counter</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {counters.map((c) => (
                <div key={c.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-sm text-slate-900">{c.counter_name}</span>
                      <StatusBadge status={c.status} />
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Department: <strong>{c.department_name}</strong>
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      Assigned Staff: <strong className="text-purple-700">{c.current_staff_name || 'Unassigned'}</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleCounter(c)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                      c.status === 'OPEN'
                        ? 'bg-rose-100 hover:bg-rose-200 text-rose-700'
                        : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700'
                    }`}
                  >
                    {c.status === 'OPEN' ? 'Close Counter' : 'Open Counter'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 5: STUDENTS & STAFF USERS */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'staff' && (
          <div className="space-y-6">
            {/* Staff Table */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900">Department Staff Members</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-3">Employee ID</th>
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">Email</th>
                      <th className="py-2.5 px-3">Department</th>
                      <th className="py-2.5 px-3">Assigned Counter</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {staffList.map((st) => (
                      <tr key={st.staff_id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{st.employee_id}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{st.name}</td>
                        <td className="py-2.5 px-3 text-slate-600">{st.email}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-700">{st.department_name}</td>
                        <td className="py-2.5 px-3 text-purple-700 font-bold">{st.assigned_counter_name || 'None'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Students Table */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900">Registered Students</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-3">College ID</th>
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">Email</th>
                      <th className="py-2.5 px-3">Course / Semester</th>
                      <th className="py-2.5 px-3">Total Tokens Issued</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {studentsList.map((stu) => (
                      <tr key={stu.student_id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{stu.college_id}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{stu.name}</td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {stu.email ? stu.email : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          <div className="font-medium text-slate-900">{stu.course || '—'}</div>
                          <div className="text-[11px] text-slate-500">({stu.semester || '5th Semester'})</div>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-blue-700">{stu.total_tokens_issued}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 6: QUEUE RULES & SETTINGS */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Queue Policies & System Rules</h2>
              <p className="text-xs text-slate-500">Configure global parameters defined in PRD Section 9</p>
            </div>

            <div className="space-y-4">
              {settings.map((item) => (
                <div key={item.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="font-mono text-xs font-bold text-slate-900 block">{item.setting_key}</span>
                    <span className="text-xs text-slate-500">{item.description}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono text-xs font-bold text-blue-800 shadow-sm">
                      {item.setting_value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 7: AUDIT TRAIL */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'audit' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Security & Action Audit Logs</h2>
              <p className="text-xs text-slate-500">Chronological activity record of staff and administrative events</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Actor</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Entity</th>
                    <th className="py-2.5 px-3">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-800">
                        {log.actor_name || 'System'} ({log.actor_role || 'SYSTEM'})
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold text-[10px]">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                        {log.entity_type} #{log.entity_id || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 font-mono">{log.ip_address || '127.0.0.1'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Add Service Modal */}
      <Modal isOpen={isAddServiceModal} onClose={() => setIsAddServiceModal(false)} title="Add Queue Service">
        <form onSubmit={handleCreateService} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Department</label>
            <select
              value={newService.departmentId}
              onChange={(e) => {
                const deptId = parseInt(e.target.value, 10);
                setNewService({
                  ...newService,
                  departmentId: deptId,
                  tokenPrefix: deptId === 1 ? 'LIB' : 'FEE'
                });
              }}
              className="w-full text-sm rounded-xl border border-slate-300 p-2.5"
            >
              <option value="1">College Library</option>
              <option value="2">Fees Payment Office</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Service Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Fine Clearance / Special Query"
              value={newService.name}
              onChange={(e) => setNewService({ ...newService, name: e.target.value })}
              className="w-full text-sm rounded-xl border border-slate-300 p-2.5"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Token Prefix</label>
              <input
                type="text"
                required
                value={newService.tokenPrefix}
                onChange={(e) => setNewService({ ...newService, tokenPrefix: e.target.value.toUpperCase() })}
                className="w-full text-sm rounded-xl border border-slate-300 p-2.5 font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Avg Service Time (min)</label>
              <input
                type="number"
                min="1"
                max="60"
                value={newService.avgServiceMinutes}
                onChange={(e) => setNewService({ ...newService, avgServiceMinutes: parseInt(e.target.value, 10) || 5 })}
                className="w-full text-sm rounded-xl border border-slate-300 p-2.5"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t">
            <button
              type="button"
              onClick={() => setIsAddServiceModal(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
            >
              Save Service
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Counter Modal */}
      <Modal isOpen={isAddCounterModal} onClose={() => setIsAddCounterModal(false)} title="Add Counter Terminal">
        <form onSubmit={handleCreateCounter} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Department</label>
            <select
              value={newCounter.departmentId}
              onChange={(e) => setNewCounter({ ...newCounter, departmentId: parseInt(e.target.value, 10) })}
              className="w-full text-sm rounded-xl border border-slate-300 p-2.5"
            >
              <option value="1">College Library</option>
              <option value="2">Fees Payment Office</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Counter Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Library Counter 3 (Quick Return)"
              value={newCounter.counterName}
              onChange={(e) => setNewCounter({ ...newCounter, counterName: e.target.value })}
              className="w-full text-sm rounded-xl border border-slate-300 p-2.5"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t">
            <button
              type="button"
              onClick={() => setIsAddCounterModal(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
            >
              Create Counter
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign Staff Modal */}
      <Modal isOpen={isAssignStaffModal} onClose={() => setIsAssignStaffModal(false)} title="Assign Staff to Counter">
        <form onSubmit={handleAssignStaff} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Select Staff Member</label>
            <select
              required
              value={assignData.staffId}
              onChange={(e) => setAssignData({ ...assignData, staffId: e.target.value })}
              className="w-full text-sm rounded-xl border border-slate-300 p-2.5"
            >
              <option value="">-- Choose Staff Member --</option>
              {staffList.map((st) => (
                <option key={st.staff_id} value={st.staff_id}>
                  {st.name} ({st.employee_id} - {st.department_name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Select Counter Terminal</label>
            <select
              required
              value={assignData.counterId}
              onChange={(e) => setAssignData({ ...assignData, counterId: e.target.value })}
              className="w-full text-sm rounded-xl border border-slate-300 p-2.5"
            >
              <option value="">-- Choose Counter --</option>
              {counters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.counter_name} ({c.department_name})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t">
            <button
              type="button"
              onClick={() => setIsAssignStaffModal(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl"
            >
              Assign to Counter
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminDashboard;
