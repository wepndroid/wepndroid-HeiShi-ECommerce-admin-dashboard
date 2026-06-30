import { Navigate, Route, Routes } from 'react-router-dom';
import { getToken } from './api/client';
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
import ConfigPage from './pages/ConfigPage';
import type { ReactNode } from 'react';

function RequireAuth({ children }: { children: ReactNode }) {
  if (!getToken()) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
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
          path="/config"
          element={
            <RequireAuth>
              <ConfigPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
