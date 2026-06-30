import { Link, useParams } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { adminApi, type OrderDetail } from '@/api/client';
import { useI18n } from '@/i18n';
import { AppShell } from '@/components/admin/AppShell';
import { PageHeader } from '@/components/admin/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/admin/StatusBadge';

export default function OrderDetailPage() {
  const { t } = useI18n();
  const { orderId } = useParams<{ orderId: string }>();
  const id = Number(orderId!);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    adminApi.order(id).then((o) => { setDetail(o); setNotes(o.adminNotes ?? ''); })
      .catch((err) => setError(err instanceof Error ? err.message : t('error')));
  }, [id, t]);
  useEffect(() => { load(); }, [load]);

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    try { await fn(); load(); }
    catch (err) { setError(err instanceof Error ? err.message : t('error')); }
    finally { setBusy(false); }
  }

  return (
    <AppShell title={detail ? `Order #${detail.id}` : t('loading')} description={t('orderDetailDesc')}>
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to="/orders"><ArrowLeft className="h-4 w-4" />{t('back')}</Link>
      </Button>
      {error ? <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
      {!detail ? <p className="text-muted-foreground">{t('loading')}</p> : (
        <>
          <PageHeader
            title={`Order #${detail.id}`}
            description={detail.title ?? ''}
            actions={
              <>
                <StatusBadge status={detail.status} />
                {detail.paymentStatus ? <StatusBadge status={detail.paymentStatus} /> : null}
              </>
            }
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2 p-5">
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  [t('buyer'), detail.buyer],
                  [t('seller'), detail.seller],
                  [t('amount'), `$${detail.amount} (+ $${detail.escrowFee} fee)`],
                  [t('paymentStatus'), detail.paymentStatus ?? '—'],
                  [t('pspTransactionId'), detail.pspTransactionId ?? detail.pspPaymentId ?? '—'],
                  [t('paymentMethod'), detail.paymentMethod ?? '—'],
                ].map(([k, v]) => (
                  <div key={String(k)} className="rounded-lg border border-border bg-muted/30 p-3">
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">{k}</dt>
                    <dd className="mt-1 text-sm font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
              {detail.disputeReason ? (
                <div className="mt-4 rounded-lg border border-warning/40 bg-warning/10 p-4">
                  <p className="text-xs font-semibold uppercase text-warning-foreground dark:text-warning">{t('disputes')}</p>
                  <p className="mt-1 text-sm">{detail.disputeReason}</p>
                </div>
              ) : null}
            </Card>

            <div className="space-y-4">
              <Card className="p-5">
                <Label htmlFor="notes" className="text-sm font-semibold">{t('adminNotes')}</Label>
                <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="mt-2" />
                <Button onClick={() => act(() => adminApi.setOrderNotes(id, notes))} disabled={busy} size="sm" className="mt-3 w-full">{t('save')}</Button>
              </Card>

              <Card className="p-5">
                <h3 className="mb-3 text-sm font-semibold">{t('actions')}</h3>
                <div className="grid gap-2">
                  <Button onClick={() => act(() => adminApi.pausePayout(id))} disabled={busy} variant="outline">{t('pausePayout')}</Button>
                  <Button onClick={() => act(() => adminApi.markAbnormal(id))} disabled={busy} variant="outline">{t('markAbnormal')}</Button>
                  {(detail.status === 'inDispute' || detail.status === 'refundInProgress') && (
                    <>
                      <Button onClick={() => act(() => adminApi.resolveDispute(id, 'refund', notes))} disabled={busy}>{t('resolveRefund')}</Button>
                      <Button onClick={() => act(() => adminApi.resolveDispute(id, 'complete', notes))} disabled={busy}>{t('resolveComplete')}</Button>
                      <Button onClick={() => act(() => adminApi.resolveDispute(id, 'cancel', notes))} disabled={busy} variant="destructive">{t('resolveCancel')}</Button>
                    </>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
