import { Link, useSearchParams } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { adminApi, type OrderRow } from '@/api/client';
import { useI18n } from '@/i18n';
import { AppShell } from '@/components/admin/AppShell';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable, TBody, TD, TH, THead, TR } from '@/components/admin/DataTable';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { EmptyState } from '@/components/admin/EmptyState';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';

const isDispute = (o: OrderRow) => o.status === 'inDispute' || o.status === 'refundInProgress';
const isRefund = (o: OrderRow) =>
  o.status === 'cancelled' ||
  o.status === 'refundInProgress' ||
  o.paymentStatus === 'refundInProgress' ||
  o.paymentStatus === 'refunded';

type OrderFilter = 'all' | 'disputes' | 'refunds';

export default function OrdersPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<OrderRow[]>([]);
  const [error, setError] = useState('');
  const [liveNotice, setLiveNotice] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const filterParam = searchParams.get('filter');
  const filter: OrderFilter =
    filterParam === 'disputes' ? 'disputes' : filterParam === 'refunds' ? 'refunds' : 'all';
  const disputesOnly = filter === 'disputes';
  const refundsOnly = filter === 'refunds';

  const snapshotOrders = useCallback(
    (rows: OrderRow[]) =>
      rows
        .map((row) => [row.id, row.status, row.paymentStatus ?? '', row.pspTransactionId ?? ''].join(':'))
        .join('|'),
    [],
  );

  const load = useCallback((opts?: { silent?: boolean }) => {
    adminApi.orders().then((res) => {
      setItems((prev) => {
        if (opts?.silent && prev.length > 0 && snapshotOrders(prev) !== snapshotOrders(res.items)) {
          setLiveNotice(t('ordersUpdated'));
        }
        return res.items;
      });
      setError('');
    })
      .catch((err) => setError(err instanceof Error ? err.message : t('error')));
  }, [snapshotOrders, t]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      load({ silent: true });
    }, 5000);
    return () => window.clearInterval(timer);
  }, [load]);
  useEffect(() => {
    if (!liveNotice) return;
    const timer = window.setTimeout(() => setLiveNotice(''), 4000);
    return () => window.clearTimeout(timer);
  }, [liveNotice]);

  const totals = useMemo(() => {
    const revenue = items.reduce((s, o) => s + (o.amount ?? 0), 0);
    const disputed = items.filter(isDispute).length;
    const paid = items.filter((o) => o.paymentStatus === 'paid' || o.paymentStatus === 'succeeded').length;
    return { revenue, disputed, paid };
  }, [items]);

  const visibleItems = useMemo(() => {
    if (disputesOnly) return items.filter(isDispute);
    if (refundsOnly) return items.filter(isRefund);
    return items;
  }, [items, disputesOnly, refundsOnly]);

  const setFilter = (next: OrderFilter) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (next === 'all') params.delete('filter');
      else params.set('filter', next);
      return params;
    });
  };

  return (
    <AppShell title={t('orders')} description={t('ordersDesc')}>
      <PageHeader title={t('orders')} description={disputesOnly ? t('filterDisputes') : refundsOnly ? t('refundRecords') : t('ordersPageDesc')} />

      <div className="mb-5 inline-flex rounded-md border border-border bg-muted/40 p-1">
        <Button size="sm" variant={filter === 'all' ? 'default' : 'ghost'} onClick={() => setFilter('all')}>{t('tabAll')}</Button>
        <Button size="sm" variant={filter === 'disputes' ? 'default' : 'ghost'} onClick={() => setFilter('disputes')}>{t('filterDisputes')}</Button>
        <Button size="sm" variant={filter === 'refunds' ? 'default' : 'ghost'} onClick={() => setFilter('refunds')}>{t('filterRefunds')}</Button>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: t('totalVolume'), value: `$${totals.revenue.toLocaleString()}` },
          { label: t('paidOrders'), value: totals.paid },
          { label: t('disputedLabel'), value: totals.disputed },
        ].map((c) => (
          <Card
            key={c.label}
            className="border-[#7ad80b] p-4 transition-all hover:bg-[#7ad80b]/20 hover:backdrop-blur-sm hover:shadow-lg hover:shadow-[#7ad80b]/40"
          >
            <p className="text-xs uppercase text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-2xl font-semibold">{c.value}</p>
          </Card>
        ))}
      </div>

      {liveNotice ? (
        <p role="status" className="mb-4 rounded-md border border-[#7ad80b] bg-[#7ad80b] px-3 py-2 text-sm text-black">
          {liveNotice}
        </p>
      ) : null}
      {error ? <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
      {visibleItems.length === 0 ? (
        <EmptyState icon={<ShoppingBag className="h-5 w-5" />} title={t('noItems')} description={disputesOnly ? t('emptyDisputes') : refundsOnly ? t('emptyRefunds') : t('emptyOrders')} />
      ) : (
        <DataTable>
          <THead>
            <TH>ID</TH>
            <TH>{t('title')}</TH>
            <TH>{t('buyer')}</TH>
            <TH>{t('seller')}</TH>
            <TH>{t('amount')}</TH>
            <TH>{t('status')}</TH>
            <TH>{t('paymentStatus')}</TH>
            <TH>{t('orderTime')}</TH>
            <TH className="text-right">{t('actions')}</TH>
          </THead>
          <TBody>
            {visibleItems.map((row) => (
              <TR key={row.id}>
                <TD className="font-mono text-xs text-muted-foreground">#{row.id}</TD>
                <TD className="max-w-[240px] truncate font-medium">{row.title ?? '—'}</TD>
                <TD>
                  {row.buyer ? (
                    <span className="flex items-center gap-2"><Avatar src={row.buyer.avatarUrl} name={row.buyer.nickname} size={24} />{row.buyer.nickname}</span>
                  ) : '—'}
                </TD>
                <TD>
                  {row.seller ? (
                    <span className="flex items-center gap-2"><Avatar src={row.seller.avatarUrl} name={row.seller.nickname} size={24} />{row.seller.nickname}</span>
                  ) : '—'}
                </TD>
                <TD className="font-semibold">${row.amount}</TD>
                <TD><StatusBadge status={row.status} /></TD>
                <TD>{row.paymentStatus ? <StatusBadge status={row.paymentStatus} /> : '—'}</TD>
                <TD className="whitespace-nowrap text-xs text-muted-foreground">{row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}</TD>
                <TD className="text-right">
                  <Button asChild size="sm" variant="ghost">
                    <Link to={`/orders/${row.id}`}>{t('view')}</Link>
                  </Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </DataTable>
      )}
    </AppShell>
  );
}
