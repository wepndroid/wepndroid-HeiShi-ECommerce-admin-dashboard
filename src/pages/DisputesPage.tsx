import { useCallback, useEffect, useState } from 'react';
import { Gavel, Check, CheckCheck, ArrowLeftRight } from 'lucide-react';
import { adminApi, type ChatMessage, type OrderDetail, type OrderRow } from '@/api/client';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import { AppShell } from '@/components/admin/AppShell';
import { PageHeader } from '@/components/admin/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { EmptyState } from '@/components/admin/EmptyState';

const isDispute = (o: OrderRow) => o.status === 'inDispute' || o.status === 'refundInProgress';

export default function DisputesPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<OrderRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadList = useCallback(async () => {
    const res = await adminApi.orders();
    const disputes = res.items.filter(isDispute);
    setItems(disputes);
    return disputes;
  }, []);

  useEffect(() => {
    loadList()
      .then((disputes) => setSelectedId((cur) => (cur != null && disputes.some((d) => d.id === cur) ? cur : disputes[0]?.id ?? null)))
      .catch((err) => setError(err instanceof Error ? err.message : t('error')));
  }, [loadList, t]);

  useEffect(() => {
    if (selectedId == null) {
      setDetail(null);
      setChat([]);
      return;
    }
    adminApi
      .order(selectedId)
      .then((o) => {
        setDetail(o);
        setNote(o.adminNotes ?? '');
      })
      .catch((err) => setError(err instanceof Error ? err.message : t('error')));
    // Retrieve the buyer↔seller conversation exactly as stored on the mobile side.
    adminApi
      .orderChat(selectedId)
      .then((res) => setChat(res.messages))
      .catch(() => setChat([]));
  }, [selectedId, t]);

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await fn();
      const disputes = await loadList();
      if (selectedId != null && !disputes.some((d) => d.id === selectedId)) {
        // Resolved out of the queue — advance to the next open dispute.
        setSelectedId(disputes[0]?.id ?? null);
      } else if (selectedId != null) {
        const o = await adminApi.order(selectedId);
        setDetail(o);
        setNote(o.adminNotes ?? '');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title={t('disputes')} description={t('disputesDesc')}>
      <PageHeader title={t('disputes')} description={t('disputesPageDesc')} />
      {error ? (
        <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      ) : null}

      {items.length === 0 ? (
        <EmptyState icon={<Gavel className="h-5 w-5" />} title={t('noItems')} description={t('emptyDisputes')} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Queue */}
          <div className="space-y-2 lg:col-span-1">
            {items.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setSelectedId(o.id)}
                className={cn(
                  'w-full rounded-md border p-3 text-left transition-colors',
                  o.id === selectedId ? 'border-primary bg-accent' : 'border-border hover:bg-muted/40',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">#{o.id} · {o.title ?? '—'}</span>
                  <StatusBadge status={o.status} />
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Avatar src={o.buyer?.avatarUrl} name={o.buyer?.nickname} size={18} />
                  <span>{o.buyer?.nickname ?? '—'}</span>
                  <span>→</span>
                  <Avatar src={o.seller?.avatarUrl} name={o.seller?.nickname} size={18} />
                  <span>{o.seller?.nickname ?? '—'}</span>
                  <span>· ${o.amount}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Handling panel */}
          <div className="lg:col-span-2">
            {detail ? (
              <Card className="space-y-5 p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-semibold">{t('orderPrefix')} #{detail.id}</h2>
                  <div className="flex gap-2">
                    <StatusBadge status={detail.status} />
                    {detail.paymentStatus ? <StatusBadge status={detail.paymentStatus} /> : null}
                  </div>
                </div>

                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {([
                    [t('buyer'), detail.buyer],
                    [t('seller'), detail.seller],
                  ] as const).map(([k, party]) => (
                    <div key={k} className="rounded-md border border-border bg-muted/30 p-3">
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{k}</dt>
                      <dd className="mt-1 flex items-center gap-2 text-sm font-medium">
                        <Avatar src={party?.avatarUrl} name={party?.nickname} size={28} />
                        <span>{party?.nickname ?? '—'}</span>
                      </dd>
                    </div>
                  ))}
                  {[
                    [t('amount'), `$${detail.amount} (+ $${detail.escrowFee} ${t('feeLabel')})`],
                    [t('paymentStatus'), detail.paymentStatus ?? '—'],
                    [t('pspTransactionId'), detail.pspTransactionId ?? detail.pspPaymentId ?? '—'],
                    [t('paymentMethod'), detail.paymentMethod ?? '—'],
                  ].map(([k, v]) => (
                    <div key={String(k)} className="rounded-md border border-border bg-muted/30 p-3">
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{k}</dt>
                      <dd className="mt-1 text-sm font-medium">{v}</dd>
                    </div>
                  ))}
                </dl>

                {detail.disputeReason ? (
                  <div className="rounded-md border border-border bg-muted/40 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('disputeReason')}</p>
                    <p className="mt-1 text-sm">{detail.disputeReason}</p>
                  </div>
                ) : null}

                <div>
                  <h3 className="mb-2 text-sm font-semibold">{t('chatTranscript')}</h3>
                  <div className="overflow-hidden rounded-lg border border-border">
                    {/* Fixed identity header: the two parties sit at the ends (buyer left,
                        seller right) with a decorative connector between them, so the bubbles
                        below no longer need to repeat each sender's avatar and name. */}
                    <div className="flex items-center gap-3 border-b border-border bg-muted/40 px-4 py-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <Avatar src={detail.buyer?.avatarUrl} name={detail.buyer?.nickname} size={36} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{detail.buyer?.nickname ?? t('buyer')}</p>
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{t('buyer')}</p>
                        </div>
                      </div>
                      <div className="flex flex-1 items-center gap-2 text-muted-foreground">
                        <span className="h-px flex-1 bg-border" />
                        <span className="grid h-7 w-7 place-items-center rounded-full border border-border bg-background">
                          <ArrowLeftRight className="h-3.5 w-3.5" />
                        </span>
                        <span className="h-px flex-1 bg-border" />
                      </div>
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="min-w-0 text-right">
                          <p className="truncate text-sm font-medium">{detail.seller?.nickname ?? t('seller')}</p>
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{t('seller')}</p>
                        </div>
                        <Avatar src={detail.seller?.avatarUrl} name={detail.seller?.nickname} size={36} />
                      </div>
                    </div>
                    {chat.length === 0 ? (
                      <p className="bg-background p-4 text-center text-sm text-muted-foreground">{t('noItems')}</p>
                    ) : (
                      <div className="flex max-h-96 flex-col gap-2 overflow-auto bg-background p-3">
                        {chat.map((m) => {
                          // Buyer on the left, seller on the right — matching the header ends.
                          const isSeller = m.senderId === detail.seller?.id;
                          const time = m.sentAt
                            ? new Date(m.sentAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                            : '';
                          return (
                            <div key={m.id} className={cn('flex', isSeller ? 'justify-end' : 'justify-start')}>
                              <div
                                className={cn(
                                  'max-w-[78%] rounded-lg px-3 py-2',
                                  isSeller ? 'border border-primary/20 bg-primary/15' : 'bg-muted',
                                )}
                              >
                                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{m.text}</p>
                                <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
                                  <span>{time}</span>
                                  {m.ackRead ? (
                                    <CheckCheck className="h-3 w-3 text-[#108EE9]" aria-label={t('read')} />
                                  ) : (
                                    <Check className="h-3 w-3" aria-label={t('sent')} />
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="dispute-note" className="text-sm font-semibold">{t('handlingNote')}</Label>
                  <Textarea id="dispute-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="mt-2" />
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <Button onClick={() => act(() => adminApi.resolveDispute(detail.id, 'refund', note))} disabled={busy}>{t('resolveRefund')}</Button>
                    <Button onClick={() => act(() => adminApi.resolveDispute(detail.id, 'complete', note))} disabled={busy}>{t('resolveComplete')}</Button>
                    <Button onClick={() => act(() => adminApi.resolveDispute(detail.id, 'cancel', note))} disabled={busy} variant="destructive">{t('resolveCancel')}</Button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <Button onClick={() => act(() => adminApi.setOrderNotes(detail.id, note))} disabled={busy} variant="outline">{t('save')}</Button>
                    <Button onClick={() => act(() => adminApi.pausePayout(detail.id))} disabled={busy} variant="outline">{t('pausePayout')}</Button>
                    <Button onClick={() => act(() => adminApi.markAbnormal(detail.id))} disabled={busy} variant="outline">{t('markAbnormal')}</Button>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-5"><p className="text-sm text-muted-foreground">{t('loading')}</p></Card>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
