import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import LoginPage from '../pages/auth/LoginPage';
import StudentDashboard from '../pages/student/StudentDashboard';
import LibraryStaffDashboard from '../pages/library/LibraryStaffDashboard';
import FeesStaffDashboard from '../pages/fees/FeesStaffDashboard';
import AdminDashboard from '../pages/admin/AdminDashboard';
import ToastNotification from '../components/common/ToastNotification';

// Protected Route Guard with Role Verification
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If user belongs to another role, redirect to their home
    if (user.role === 'STUDENT') return <Navigate to="/student" replace />;
    if (user.role === 'LIBRARY_STAFF') return <Navigate to="/staff/library" replace />;
    if (user.role === 'FEES_STAFF') return <Navigate to="/staff/fees" replace />;
    if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Root index redirector
const RootRedirect = () => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) return null;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;

  if (user.role === 'STUDENT') return <Navigate to="/student" replace />;
  if (user.role === 'LIBRARY_STAFF') return <Navigate to="/staff/library" replace />;
  if (user.role === 'FEES_STAFF') return <Navigate to="/staff/fees" replace />;
  if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;

  return <Navigate to="/login" replace />;
};

const AppRoutes = () => {
  return (
    <>
      <ToastNotification />
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Student Portal */}
        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRoles={['STUDENT', 'ADMIN']}>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />

        {/* Library Staff Portal */}
        <Route
          path="/staff/library"
          element={
            <ProtectedRoute allowedRoles={['LIBRARY_STAFF', 'ADMIN']}>
              <LibraryStaffDashboard />
            </ProtectedRoute>
          }
        />

        {/* Fees Staff Portal */}
        <Route
          path="/staff/fees"
          element={
            <ProtectedRoute allowedRoles={['FEES_STAFF', 'ADMIN']}>
              <FeesStaffDashboard />
            </ProtectedRoute>
          }
        />

        {/* Admin Portal */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

export default AppRoutes;
