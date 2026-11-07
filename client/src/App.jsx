import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FinanceProvider } from './context/FinanceContext';
import AppLayout from './layouts/AppLayout';

import Overview from './pages/Overview';
import Transactions from './pages/Transactions';
import Receipts from './pages/Receipts';
import Budgets from './pages/Budgets';
import Analytics from './pages/Analytics';
import Products from './pages/Products';
import BeforeYouBuy from './pages/BeforeYouBuy';
import Assistant from './pages/Assistant';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';

// Protected Route Guard
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-xs font-semibold">
        Verifying secure session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <FinanceProvider>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected App Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Overview />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="receipts" element={<Receipts />} />
              <Route path="budgets" element={<Budgets />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="products" element={<Products />} />
              <Route path="before-you-buy" element={<BeforeYouBuy />} />
              <Route path="assistant" element={<Assistant />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </FinanceProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
