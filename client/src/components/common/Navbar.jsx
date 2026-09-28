import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../api/client';
import {
  Bell,
  LogOut,
  User,
  Building2,
  BookOpen,
  CreditCard,
  ShieldCheck,
  Check,
  ChevronDown
} from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { lastQueueEvent } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.success) {
        setNotifications(res.notifications || []);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user, lastQueueEvent]);

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            <ShieldCheck className="w-3 h-3 mr-1" /> Administrator
          </span>
        );
      case 'LIBRARY_STAFF':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <BookOpen className="w-3 h-3 mr-1" /> Library Staff
          </span>
        );
      case 'FEES_STAFF':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
            <CreditCard className="w-3 h-3 mr-1" /> Fees Staff
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <User className="w-3 h-3 mr-1" /> Student
          </span>
        );
    }
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-black tracking-tight text-slate-900">
                  CQMS
                </span>
                <span className="hidden sm:inline-block text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200">
                  Library & Fees
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden md:block">
                College Queue Management System
              </p>
            </div>
          </div>

          {/* Right Action Icons & User Info */}
          <div className="flex items-center space-x-3 sm:space-x-5">
            {user && (
              <>
                {/* Role Badge */}
                <div className="hidden sm:block">
                  {getRoleBadge(user.role)}
                </div>

                {/* Notifications Bell */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition focus:outline-none"
                    aria-label="Notifications"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Dropdown Drawer */}
                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-semibold text-slate-900 text-sm">Notifications</h4>
                          {unreadCount > 0 && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">
                              {unreadCount} new
                            </span>
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Mark read</span>
                          </button>
                        )}
                      </div>

                      <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-8 text-center text-slate-400 text-sm">
                            No notifications yet.
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <div
                              key={n.id}
                              className={`p-3 text-xs transition ${
                                !n.is_read ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <span className="font-bold text-slate-900">{n.title}</span>
                                <span className="text-[10px] text-slate-400">
                                  {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="mt-1 text-slate-600">{n.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* User Info Capsule */}
                <div className="flex items-center space-x-2.5 pl-2 border-l border-slate-200">
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs">
                    {user.name?.charAt(0) || 'U'}
                  </div>
                  <div className="hidden lg:block text-left">
                    <div className="text-xs font-bold text-slate-900 leading-none">
                      {user.name}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {user.collegeId || user.email}
                    </div>
                  </div>
                </div>

                {/* Logout Button */}
                <button
                  onClick={logout}
                  title="Sign Out"
                  className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
