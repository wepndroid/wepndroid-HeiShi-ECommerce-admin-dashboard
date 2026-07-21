import { Navigate, Route, Routes, useParams } from 'react-router-dom';
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
import ReviewsPage from './pages/ReviewsPage';
import ReviewDetailPage from './pages/ReviewDetailPage';
import ChatRiskPage from './pages/ChatRiskPage';
import CategoriesPage from './pages/CategoriesPage';
import BannersPage from './pages/BannersPage';
import SystemConfigPage from './pages/SystemConfigPage';
import SupportPage from './pages/SupportPage';
import ExposureRulesPage from './pages/ExposureRulesPage';
import MediaReviewPage from './pages/MediaReviewPage';
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

/** Wraps a page in the admin auth guard — keeps the route table readable. */
function Guard({ children }: { children: ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}

function LegacyContentRedirect() {
  const { listingId } = useParams<{ listingId?: string }>();
  return <Navigate to={listingId ? `/products/${listingId}` : '/products'} replace />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Guard><DashboardPage /></Guard>} />

        {/* 用户管理 */}
        <Route path="/users" element={<Guard><UsersPage /></Guard>} />
        <Route path="/users/:userId" element={<Guard><UserDetailPage /></Guard>} />

        {/* Product management detail now lives fully under /products. */}
        <Route path="/products" element={<Guard><ContentPage mode="all" /></Guard>} />
        <Route path="/products/:listingId" element={<Guard><ContentDetailPage /></Guard>} />
        <Route path="/content" element={<LegacyContentRedirect />} />
        <Route path="/content/:listingId" element={<LegacyContentRedirect />} />

        {/* 订单/交易 (disputes merged in via ?filter=disputes) */}
        <Route path="/orders" element={<Guard><OrdersPage /></Guard>} />
        <Route path="/orders/:orderId" element={<Guard><OrderDetailPage /></Guard>} />
        {/* Disputes merged into Orders — keep the old path working. */}
        <Route path="/disputes" element={<Navigate to="/orders?filter=disputes" replace />} />

        {/* 评价管理 */}
        <Route path="/reviews" element={<Guard><ReviewsPage /></Guard>} />
        <Route path="/reviews/:reviewId" element={<Guard><ReviewDetailPage /></Guard>} />

        {/* 举报管理 */}
        <Route path="/reports" element={<Guard><ReportsPage /></Guard>} />
        <Route path="/reports/:reportId" element={<Guard><ReportDetailPage /></Guard>} />

        {/* 聊天风控 */}
        <Route path="/chat-risk" element={<Guard><ChatRiskPage /></Guard>} />
        <Route path="/media-review" element={<Guard><MediaReviewPage /></Guard>} />
        <Route path="/support" element={<Guard><SupportPage /></Guard>} />

        {/* 认证管理 */}
        <Route path="/verifications" element={<Guard><VerificationsPage /></Guard>} />
        <Route path="/verifications/:submissionId" element={<Guard><VerificationDetailPage /></Guard>} />

        {/* 平台配置: 分类 / Banner / 系统配置 */}
        <Route path="/config" element={<Navigate to="/config/categories" replace />} />
        <Route path="/config/categories" element={<Guard><CategoriesPage /></Guard>} />
        <Route path="/config/banners" element={<Guard><BannersPage /></Guard>} />
        <Route path="/config/system" element={<Guard><SystemConfigPage /></Guard>} />
        <Route path="/config/exposure" element={<Guard><ExposureRulesPage /></Guard>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}
