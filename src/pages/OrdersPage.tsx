import { Link } from 'react-router-dom';
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

export default function OrdersPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<OrderRow[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    adminApi.orders().then((res) => setItems(res.items))
      .catch((err) => setError(err instanceof Error ? err.message : t('error')));
  }, [t]);
  useEffect(() => { load(); }, [load]);

  const totals = useMemo(() => {
    const revenue = items.reduce((s, o) => s + (o.amount ?? 0), 0);
    const disputed = items.filter(isDispute).length;
    const paid = items.filter((o) => o.paymentStatus === 'paid' || o.paymentStatus === 'succeeded').length;
    return { revenue, disputed, paid };
  }, [items]);

  return (
    <AppShell title={t('orders')} description={t('ordersDesc')}>
      <PageHeader title={t('orders')} description={t('ordersPageDesc')} />

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

      {error ? <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
      {items.length === 0 ? (
        <EmptyState icon={<ShoppingBag className="h-5 w-5" />} title={t('noItems')} description={t('emptyOrders')} />
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
            <TH className="text-right">{t('actions')}</TH>
          </THead>
          <TBody>
            {items.map((row) => (
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
