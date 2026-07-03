import { Navigate, Route, Routes } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { adminApi, clearToken, getToken } from './api/client';
import { ErrorBoundary } from './components/ErrorBoundary';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ContentPage from './pages/ContentPage';
import ContentDetailPage from './pages/ContentDetailPage';
import UsersPage from './pages/UsersPage';
import UserDetailPage from './pages/UserDetailPage';
import VerificationsPage from './pages/VerificationsPage';
import VerificationDetailPage from './pages/VerificationDetailPage';
import ReportsPage from './pages/ReportsPage';
import ReportDetailPage from './pages/ReportDetailPage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import DisputesPage from './pages/DisputesPage';
import ConfigPage from './pages/ConfigPage';
import type { ReactNode } from 'react';

// Cached once per session so the admin check doesn't re-run (and flash a spinner) on every
// route change. Reset when the token is cleared so a fresh login re-verifies.
let adminVerified = false;

/**
 * Guards admin routes: a token must exist AND resolve to an admin via adminApi.me()
 * (the backend route is require_admin-guarded; the mock enforces the same). A non-admin
 * or stale token is cleared and bounced to /login, so non-admins cannot access the web.
 */
function RequireAuth({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'checking' | 'ok' | 'denied'>(() =>
    !getToken() ? 'denied' : adminVerified ? 'ok' : 'checking',
  );

  useEffect(() => {
    if (!getToken()) {
      adminVerified = false;
      setState('denied');
      return;
    }
    if (adminVerified) return; // already verified this session — no re-check, no flash
    let active = true;
    adminApi
      .me()
      .then((me) => {
        if (!active) return;
        if (me?.isAdmin) {
          adminVerified = true;
          setState('ok');
        } else {
          clearToken();
          adminVerified = false;
          setState('denied');
        }
      })
      .catch(() => {
        if (!active) return;
        clearToken();
        adminVerified = false;
        setState('denied');
      });
    return () => {
      active = false;
    };
  }, []);

  if (state === 'denied') return <Navigate to="/login" replace />;
  if (state === 'checking') {
    return (
      <div className="grid min-h-dvh place-items-center bg-background" aria-busy="true">
        <span
          className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary"
          role="status"
          aria-label="Loading"
        />
      </div>
    );
  }
  return children;
}

export default function App() {
  return (
    <ErrorBoundary>
    <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
        />
        <Route
          path="/users"
          element={
            <RequireAuth>
              <UsersPage />
            </RequireAuth>
          }
        />
        <Route
          path="/users/:userId"
          element={
            <RequireAuth>
              <UserDetailPage />
            </RequireAuth>
          }
        />
        <Route
          path="/verifications"
          element={
            <RequireAuth>
              <VerificationsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/verifications/:submissionId"
          element={
            <RequireAuth>
              <VerificationDetailPage />
            </RequireAuth>
          }
        />
        <Route
          path="/content"
          element={
            <RequireAuth>
              <ContentPage />
            </RequireAuth>
          }
        />
        <Route
          path="/content/:listingId"
          element={
            <RequireAuth>
              <ContentDetailPage />
            </RequireAuth>
          }
        />
        <Route
          path="/reports"
          element={
            <RequireAuth>
              <ReportsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/reports/:reportId"
          element={
            <RequireAuth>
              <ReportDetailPage />
            </RequireAuth>
          }
        />
        <Route
          path="/orders"
          element={
            <RequireAuth>
              <OrdersPage />
            </RequireAuth>
          }
        />
        <Route
          path="/orders/:orderId"
          element={
            <RequireAuth>
              <OrderDetailPage />
            </RequireAuth>
          }
        />
        <Route
          path="/disputes"
          element={
            <RequireAuth>
              <DisputesPage />
            </RequireAuth>
          }
        />
        <Route
          path="/config"
          element={
            <RequireAuth>
              <ConfigPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </ErrorBoundary>
  );
}
