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
  CheckCircle2,
  Package,
  Search as SearchIcon,
} from 'lucide-react';
import { adminApi, type DashboardStats } from '@/api/client';
import { useI18n } from '@/i18n';
import { AppShell } from '@/components/admin/AppShell';
import { StatCard } from '@/components/admin/StatCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const { t, locale } = useI18n();
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
    { label: t('verifications'), to: '/verifications', count: stats?.pendingVerificationCount ?? 0 },
    { label: t('products'), to: '/products', count: stats?.pendingReviewCount ?? 0 },
    { label: t('reports'), to: '/reports', count: stats?.reportCount ?? 0 },
    { label: t('disputes'), to: '/orders?filter=disputes', count: stats?.disputeOrderCount ?? 0 },
  ];

  const categories = stats?.popularCategories ?? [];
  const searchTerms = stats?.popularSearchTerms ?? [];
  const maxCatCount = Math.max(1, ...categories.map((c) => c.count));

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

      {/* Row 1 — core marketplace counts */}
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
          label={t('activeListings')}
          value={v(stats?.activeListingCount)}
          icon={<Package className="h-3.5 w-3.5" />}
          accent="info"
        />
        <StatCard
          label={t('completedTrades')}
          value={v(stats?.completedTradeCount)}
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          hint={`${t('orderCount')}: ${v(stats?.orderCount)}`}
          accent="success"
        />
      </section>

      {/* Row 2 — activity & moderation backlog */}
      <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={t('dau')}
          value={v(stats?.dau)}
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          accent="primary"
        />
        <StatCard
          label={t('pendingReview')}
          value={v(stats?.pendingReviewCount)}
          icon={<FileSearch className="h-3.5 w-3.5" />}
          hint={t('filterPending')}
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
          label={t('verifications')}
          value={v(stats?.pendingVerificationCount)}
          icon={<ShieldCheck className="h-3.5 w-3.5" />}
          hint={t('filterPending')}
          accent="info"
        />
      </section>

      {/* 热门分类 / 热门搜索词 */}
      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <header className="mb-4 flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">{t('popularCategories')}</h2>
          </header>
          {categories.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">{t('noDataYet')}</p>
          ) : (
            <div className="space-y-2.5">
              {categories.map((c) => (
                <div key={c.key} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 truncate text-[13px] font-medium text-foreground">
                    {locale === 'zh' ? c.labelZh : c.labelEn}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-[#7ad80b]"
                      style={{ width: `${Math.round((c.count / maxCatCount) * 100)}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums">{c.count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <header className="mb-4 flex items-center gap-2">
            <SearchIcon className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">{t('popularSearchTerms')}</h2>
          </header>
          {searchTerms.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">{t('noDataYet')}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {searchTerms.map((s, i) => (
                <span
                  key={s.term}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[13px]"
                >
                  <span className="text-muted-foreground tabular-nums">{i + 1}</span>
                  <span className="font-medium text-foreground">{s.term}</span>
                  <span className="rounded bg-muted px-1.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
                    {s.count}
                  </span>
                </span>
              ))}
            </div>
          )}
        </Card>
      </section>

      {/* Queue health */}
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
