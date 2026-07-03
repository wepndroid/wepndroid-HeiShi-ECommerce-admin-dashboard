import { Link } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import {
  Users,
  ShieldCheck,
  Flag,
  ShoppingBag,
  FileSearch,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  MousePointerClick,
} from 'lucide-react';
import { adminApi, type DashboardStats } from '@/api/client';
import { useI18n } from '@/i18n';
import { AppShell } from '@/components/admin/AppShell';
import { StatCard } from '@/components/admin/StatCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const { t } = useI18n();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    adminApi
      .stats()
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : t('error')));
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const v = (n: number | undefined) => (n ?? 0).toLocaleString();

  const queues = [
    {
      label: t('verifications'),
      to: '/verifications',
      count: stats?.pendingVerificationCount ?? 0,
    },
    {
      label: t('contentReview'),
      to: '/content',
      count: stats?.pendingReviewCount ?? 0,
    },
    {
      label: t('reports'),
      to: '/reports',
      count: stats?.reportCount ?? 0,
    },
    {
      label: t('disputes'),
      to: '/disputes',
      count: stats?.disputeOrderCount ?? 0,
    },
  ];

  return (
    <AppShell title={t('dashboard')} description={t('dashboardDesc')}>
      {error ? (
        <div className="mb-5 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t('dashboard')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('dashboardSubtitle')}</p>
        </div>
        <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={load}>
          <RefreshCw className="h-3.5 w-3.5" /> {t('refresh')}
        </Button>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={t('totalUsers')}
          value={v(stats?.totalUsers)}
          icon={<Users className="h-3.5 w-3.5" />}
          hint={`${t('newUsersToday')}: ${v(stats?.newUsersToday)}`}
          accent="primary"
        />
        <StatCard
          label={t('totalListings')}
          value={v(stats?.totalListings)}
          icon={<FileSearch className="h-3.5 w-3.5" />}
          hint={`${t('pendingReview')}: ${v(stats?.pendingReviewCount)}`}
          accent="warning"
        />
        <StatCard
          label={t('reportCount')}
          value={v(stats?.reportCount)}
          icon={<Flag className="h-3.5 w-3.5" />}
          hint={t('filterPending')}
          accent="danger"
        />
        <StatCard
          label={t('orderCount')}
          value={v(stats?.orderCount)}
          icon={<ShoppingBag className="h-3.5 w-3.5" />}
          hint={`${t('disputes')}: ${v(stats?.disputeOrderCount)}`}
          accent="info"
        />
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={t('dau')}
          value={v(stats?.dau)}
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          accent="primary"
        />
        <StatCard
          label={t('promotionClicks')}
          value={v(stats?.promotionClicks)}
          icon={<MousePointerClick className="h-3.5 w-3.5" />}
          accent="info"
        />
        <StatCard
          label={t('verifications')}
          value={v(stats?.pendingVerificationCount)}
          icon={<ShieldCheck className="h-3.5 w-3.5" />}
          hint={t('filterPending')}
          accent="warning"
        />
        <StatCard
          label={t('newUsersToday')}
          value={v(stats?.newUsersToday)}
          icon={<Users className="h-3.5 w-3.5" />}
          accent="success"
        />
      </section>

      <Card className="mt-4 p-4">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">{t('queueHealth')}</h2>
            <p className="text-xs text-muted-foreground">{t('queueHealthDesc')}</p>
          </div>
        </header>
        <div className="space-y-2">
          {queues.map((row) => (
            <Link
              key={row.to}
              to={row.to}
              className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2.5 transition-colors hover:border-foreground/20"
            >
              <span className="text-[13px] font-medium text-foreground">{row.label}</span>
              <span className="flex items-center gap-2 text-sm tabular-nums">
                <span className="font-semibold">{row.count}</span>
                <span className="text-muted-foreground">{t('open')}</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </span>
            </Link>
          ))}
        </div>
      </Card>
    </AppShell>
  );
}
