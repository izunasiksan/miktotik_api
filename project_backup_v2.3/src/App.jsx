import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore.js';
import Layout from './components/templates/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { Toaster } from 'react-hot-toast';
import LoadingSpinner from './components/atoms/LoadingSpinner.jsx';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // Data is fresh for 30 seconds
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Lazy load pages
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const AnalysisV2 = lazy(() => import('./features/analysis_v2/components/AnalysisV2.jsx'));
const Boards = lazy(() => import('./pages/Boards.jsx'));
const RouterDetail = lazy(() => import('./pages/RouterDetail.jsx'));
const Reports = lazy(() => import('./pages/Reports.jsx'));
const Users = lazy(() => import('./pages/Users.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));
const AuditLogs = lazy(() => import('./pages/AuditLogs.jsx'));
const Automation = lazy(() => import('./pages/Automation.jsx'));
const ZTPQueue = lazy(() => import('./pages/ZTPQueue.jsx'));
const DeveloperConsole = lazy(() => import('./pages/DeveloperConsole.jsx'));

function App() {
  const initAuth = useAuthStore(state => state.initAuth);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Toaster position="top-right" />
        <Suspense fallback={
          <div className="flex h-screen items-center justify-center bg-slate-50">
            <LoadingSpinner size="lg" />
          </div>
        }>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="analysis-v2" element={<AnalysisV2 />} />
              <Route path="boards" element={<Boards />} />
              <Route path="boards/:id" element={<RouterDetail />} />
              <Route path="reports" element={<Reports />} />
              <Route path="users" element={<Users />} />
              <Route path="audit-logs" element={<AuditLogs />} />
              <Route path="settings" element={<Settings />} />
              <Route path="automation" element={<Automation />} />
              <Route path="ztp" element={<ZTPQueue />} />
            </Route>
            
            <Route path="/developer" element={
              <ProtectedRoute>
                <DeveloperConsole />
              </ProtectedRoute>
            } />
          </Routes>
        </Suspense>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
