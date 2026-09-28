import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, BookOpen, CreditCard, ShieldCheck } from 'lucide-react';

const PERSONAS = [
  {
    role: 'STUDENT',
    title: 'Demo Student',
    name: 'Soumyadip Kar',
    email: 'BCREC-2024-001',
    pass: 'student123',
    icon: User,
    color: 'hover:border-blue-400 hover:bg-blue-50/50',
    badge: 'bg-blue-100 text-blue-700'
  },
  {
    role: 'LIBRARY_STAFF',
    title: 'Library Staff',
    name: 'Rajesh Sharma',
    email: 'library@cqms.edu',
    pass: 'library123',
    icon: BookOpen,
    color: 'hover:border-emerald-400 hover:bg-emerald-50/50',
    badge: 'bg-emerald-100 text-emerald-700'
  },
  {
    role: 'FEES_STAFF',
    title: 'Fees Staff',
    name: 'Priya Patel',
    email: 'fees@cqms.edu',
    pass: 'fees123',
    icon: CreditCard,
    color: 'hover:border-indigo-400 hover:bg-indigo-50/50',
    badge: 'bg-indigo-100 text-indigo-700'
  },
  {
    role: 'ADMIN',
    title: 'System Admin',
    name: 'Dr. Amit Roy',
    email: 'admin@cqms.edu',
    pass: 'admin123',
    icon: ShieldCheck,
    color: 'hover:border-purple-400 hover:bg-purple-50/50',
    badge: 'bg-purple-100 text-purple-700'
  }
];

const QuickPersonaSwitcher = ({ onSelectPersona, inline = false }) => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleQuickLogin = async (p) => {
    if (onSelectPersona) {
      onSelectPersona(p.email, p.pass);
      return;
    }
    try {
      const user = await login(p.email, p.pass);
      if (user.role === 'STUDENT') navigate('/student');
      else if (user.role === 'LIBRARY_STAFF') navigate('/staff/library');
      else if (user.role === 'FEES_STAFF') navigate('/staff/fees');
      else if (user.role === 'ADMIN') navigate('/admin');
    } catch (err) {
      console.error('Quick login failed:', err);
    }
  };

  return (
    <div className={`w-full ${inline ? '' : 'p-4 bg-slate-100/80 rounded-2xl border border-slate-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Demo Persona Fast-Switch (Viva / Evaluation)
        </span>
        <span className="text-[11px] text-slate-400 font-mono">1-Click Auto Fill</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {PERSONAS.map((p) => {
          const Icon = p.icon;
          return (
            <button
              key={p.role}
              type="button"
              onClick={() => handleQuickLogin(p)}
              className={`flex items-center p-2.5 rounded-xl border border-slate-200 bg-white text-left transition shadow-sm ${p.color}`}
            >
              <div className="p-2 rounded-lg bg-slate-100 text-slate-700 mr-2.5">
                <Icon className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-bold text-slate-900 truncate">{p.title}</span>
                </div>
                <div className="text-[11px] text-slate-500 truncate">{p.name}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuickPersonaSwitcher;
