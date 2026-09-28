import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import QuickPersonaSwitcher from '../../components/common/QuickPersonaSwitcher';
import { Building2, KeyRound, Mail, ArrowRight, ShieldCheck, Info } from 'lucide-react';

const LoginPage = () => {
  const [identifier, setIdentifier] = useState('student@cqms.edu');
  const [password, setPassword] = useState('student123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e?.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(identifier, password);
      if (user.role === 'STUDENT') {
        navigate('/student');
      } else if (user.role === 'LIBRARY_STAFF') {
        navigate('/staff/library');
      } else if (user.role === 'FEES_STAFF') {
        navigate('/staff/fees');
      } else if (user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillPersona = (email, pass) => {
    setIdentifier(email);
    setPassword(pass);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50/50 to-indigo-50/30 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* College Header */}
        <div className="mx-auto w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-600/30 mb-4">
          <Building2 className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
          College Queue Management System
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Digital Token & Live Queue Tracker for <strong className="text-blue-700">Library</strong> and <strong className="text-indigo-700">Fees Payment Office</strong>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 rounded-3xl border border-slate-200/80 sm:px-10">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start space-x-2">
              <span className="font-bold">Error:</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                College ID / Email Address
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. student@cqms.edu or STU-2024-001"
                  className="block w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center py-3 px-4 rounded-xl shadow-lg shadow-blue-600/20 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 transition disabled:opacity-50"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </button>
          </form>

          {/* Quick Persona Fill */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <QuickPersonaSwitcher onSelectPersona={fillPersona} inline={true} />
          </div>
        </div>

        {/* Demo Credentials Info Box */}
        <div className="mt-6 p-4 rounded-2xl bg-white/80 border border-slate-200 text-xs text-slate-600 shadow-sm">
          <div className="flex items-center space-x-1.5 font-bold text-slate-800 mb-1.5">
            <Info className="w-4 h-4 text-blue-600" />
            <span>Default Test Credentials</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
            <div><strong>Student:</strong> student@cqms.edu / student123</div>
            <div><strong>Library Staff:</strong> library@cqms.edu / library123</div>
            <div><strong>Fees Staff:</strong> fees@cqms.edu / fees123</div>
            <div><strong>Admin:</strong> admin@cqms.edu / admin123</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
