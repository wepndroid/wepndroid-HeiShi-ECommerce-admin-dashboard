import { Link, useParams } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink, Check, CheckCheck, ArrowLeftRight } from 'lucide-react';
import { adminApi, type ChatMessage, type ContentDetail, type OrderDetail } from '@/api/client';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import { AppShell } from '@/components/admin/AppShell';
import { PageHeader } from '@/components/admin/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar } from '@/components/ui/avatar';
import { ImageLightbox } from '@/components/ui/image-lightbox';
import { StatusBadge } from '@/components/admin/StatusBadge';

export default function OrderDetailPage() {
  const { t } = useI18n();
  const { orderId } = useParams<{ orderId: string }>();
  const id = Number(orderId!);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [listing, setListing] = useState<ContentDetail | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [liveNotice, setLiveNotice] = useState('');

  const snapshotDetail = useCallback(
    (value: OrderDetail | null, messages: ChatMessage[]) =>
      value
        ? [
            value.status,
            value.paymentStatus ?? '',
            value.payoutStatus ?? '',
            value.disputeStatus ?? '',
            value.disputeReason ?? '',
            value.adminNotes ?? '',
            messages.length,
          ].join('|')
        : '',
    [],
  );

  const load = useCallback((opts?: { silent?: boolean }) => {
    adminApi
      .order(id)
      .then((o) => {
        const sync = (messages: ChatMessage[]) => {
        if (opts?.silent && detail && snapshotDetail(detail, chat) !== snapshotDetail(o, messages)) {
          setLiveNotice(t('ordersUpdated'));
        }
        setDetail(o);
        setNotes((current) => (opts?.silent || busy ? current : (o.adminNotes ?? '')));
        setError('');
      };
        adminApi.contentDetail(o.listingId).then(setListing).catch(() => setListing(null));
        if (o.status === 'inDispute' || o.status === 'refundInProgress') {
          adminApi
            .orderChat(id)
            .then((res) => {
              setChat(res.messages);
              sync(res.messages);
            })
            .catch(() => {
              setChat([]);
              sync([]);
            });
        } else {
          setChat([]);
          sync([]);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : t('error')));
  }, [busy, chat, detail, id, snapshotDetail, t]);
  useEffect(() => {
    load();
  }, [load]);
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

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell
      title={detail ? `${t('orderPrefix')} #${detail.id}` : t('loading')}
      description={t('orderDetailDesc')}
    >
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to="/orders">
          <ArrowLeft className="h-4 w-4" />
          {t('back')}
        </Link>
      </Button>
      {liveNotice ? (
        <p
          role="status"
          className="mb-4 rounded-md border border-[#7ad80b] bg-[#7ad80b] px-3 py-2 text-sm text-black"
        >
          {liveNotice}
        </p>
      ) : null}
      {error ? (
        <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {!detail ? (
        <p className="text-muted-foreground">{t('loading')}</p>
      ) : (
        <>
          <PageHeader
            title={`${t('orderPrefix')} #${detail.id}`}
            description={detail.title ?? ''}
            actions={
              <>
                <StatusBadge status={detail.status} />
                {detail.paymentStatus ? <StatusBadge status={detail.paymentStatus} /> : null}
                {detail.payoutStatus ? <StatusBadge status={detail.payoutStatus} /> : null}
              </>
            }
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <Card className="p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">{t('listingDetails')}</h3>
                  <Button asChild size="sm" variant="ghost">
                    <Link to={`/content/${detail.listingId}`}>
                      <ExternalLink className="h-4 w-4" />
                      {t('viewListing')}
                    </Link>
                  </Button>
                </div>
                {listing ? (
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      {listing.images[0] ? (
                        <button
                          type="button"
                          onClick={() => setPreviewSrc(listing.images[0])}
                          aria-label={t('viewImage')}
                          className="shrink-0 overflow-hidden rounded-lg border border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <img
                            src={listing.images[0]}
                            alt={listing.title}
                            className="h-20 w-20 object-cover"
                          />
                        </button>
                      ) : null}
                      <div className="min-w-0">
                        <p className="font-medium">{listing.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium capitalize">
                            {listing.type}
                          </span>
                          <StatusBadge status={listing.reviewStatus} />
                          {listing.status ? <StatusBadge status={listing.status} /> : null}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {t('listPrice')}:{' '}
                          <span className="font-medium text-foreground">
                            ${listing.price} {listing.currency}
                          </span>
                        </p>
                      </div>
                    </div>

                    {listing.description ? (
                      <p className="whitespace-pre-line text-sm text-muted-foreground">
                        {listing.description}
                      </p>
                    ) : null}

                    {listing.images.length > 1 ? (
                      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                        {listing.images.map((url) => (
                          <button
                            key={url}
                            type="button"
                            onClick={() => setPreviewSrc(url)}
                            aria-label={t('viewImage')}
                            className="overflow-hidden rounded-md border border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <img src={url} alt="" className="aspect-square w-full object-cover" />
                          </button>
                        ))}
                      </div>
                    ) : null}

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <dl className="space-y-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {t('attributes')}
                        </p>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">{t('category')}</dt>
                          <dd className="font-medium">{listing.categoryKey ?? '—'}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">{t('tags')}</dt>
                          <dd className="font-medium">{listing.tagKey ?? '—'}</dd>
                        </div>
                        {listing.conditionKey ? (
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">{t('condition')}</dt>
                            <dd className="font-medium">{listing.conditionKey}</dd>
                          </div>
                        ) : null}
                        {listing.serviceIcon ? (
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">{t('serviceType')}</dt>
                            <dd className="font-medium">{listing.serviceIcon}</dd>
                          </div>
                        ) : null}
                        <div className="flex justify-between gap-4">
                          <dt className="text-muted-foreground">{t('location')}</dt>
                          <dd className="text-right font-medium">
                            {listing.locationLabel ?? `${listing.city} / ${listing.area}`}
                          </dd>
                        </div>
                      </dl>
                      <dl className="space-y-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {t('tradeOptions')}
                        </p>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">{t('negotiable')}</dt>
                          <dd className="font-medium">{listing.negotiable ? t('yes') : t('no')}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">{t('escrow')}</dt>
                          <dd className="font-medium">
                            {listing.escrowSupported ? t('yes') : t('no')}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">{t('meetInPublic')}</dt>
                          <dd className="font-medium">
                            {listing.meetInPublic ? t('yes') : t('no')}
                          </dd>
                        </div>
                        {listing.pickupMethods?.length ? (
                          <div className="flex justify-between gap-4">
                            <dt className="text-muted-foreground">{t('pickupMethods')}</dt>
                            <dd className="text-right font-medium">
                              {listing.pickupMethods.join(', ')}
                            </dd>
                          </div>
                        ) : null}
                        {listing.type === 'job' ? (
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">{t('merchantPost')}</dt>
                            <dd className="font-medium">{listing.merchantPost ? t('yes') : t('no')}</dd>
                          </div>
                        ) : null}
                      </dl>
                    </div>

                    {listing.bundleMeta && listing.bundleMeta.items.length > 0 ? (
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <h4 className="text-sm font-semibold">{t('bundleItems')}</h4>
                          <span className="text-xs text-muted-foreground">
                            {t('allowSeparateSale')}: {listing.bundleMeta.allowSeparateSale ? t('yes') : t('no')}
                          </span>
                        </div>
                        <ul className="divide-y divide-border rounded-lg border border-border">
                          {listing.bundleMeta.items.map((it, i) => (
                            <li
                              key={i}
                              className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                            >
                              <span className="font-medium">{it.title}</span>
                              <span className="flex items-center gap-3">
                                <span className="text-muted-foreground">
                                  ${it.sharePrice}
                                  {it.separatePrice != null
                                    ? ` · $${it.separatePrice} ${t('separatePrice')}`
                                    : ''}
                                </span>
                                <StatusBadge status={it.status} />
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {detail.title ? (
                      <span className="font-medium text-foreground">{detail.title}</span>
                    ) : null}{' '}
                    {t('listingUnavailable')}
                  </p>
                )}
              </Card>

              <Card className="p-5">
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {([
                    [t('buyer'), detail.buyer],
                    [t('seller'), detail.seller],
                  ] as const).map(([k, party]) => (
                    <div key={k} className="rounded-lg border border-border bg-muted/30 p-3">
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
                    <div key={String(k)} className="rounded-lg border border-border bg-muted/30 p-3">
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{k}</dt>
                      <dd className="mt-1 text-sm font-medium">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {[
                    [t('payoutStatus'), detail.payoutStatus ?? '—'],
                    [t('payoutProvider'), detail.payoutProvider ?? '—'],
                    [t('payoutReference'), detail.payoutReference ?? detail.payoutReversalReference ?? '—'],
                    [t('payoutReleasedAt'), detail.payoutReleasedAt ?? '—'],
                  ].map(([k, v]) => (
                    <div key={String(k)} className="rounded-lg border border-border bg-muted/30 p-3">
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{k}</dt>
                      <dd className="mt-1 text-sm font-medium">{v}</dd>
                    </div>
                  ))}
                </div>
                {detail.payoutFailureReason ? (
                  <div className="mt-4 rounded-lg border border-warning/40 bg-warning/10 p-4">
                    <p className="text-xs font-semibold uppercase text-warning-foreground dark:text-warning">
                      {t('payoutFailureReason')}
                    </p>
                    <p className="mt-1 text-sm">{detail.payoutFailureReason}</p>
                  </div>
                ) : null}
                {detail.disputeReason ? (
                  <div className="mt-4 rounded-lg border border-warning/40 bg-warning/10 p-4">
                    <p className="text-xs font-semibold uppercase text-warning-foreground dark:text-warning">
                      {t('disputes')}
                    </p>
                    <p className="mt-1 text-sm">{detail.disputeReason}</p>
                  </div>
                ) : null}
              </Card>
            </div>

            <div className="space-y-4">
              <Card className="p-5">
                <Label htmlFor="notes" className="text-sm font-semibold">
                  {t('adminNotes')}
                </Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="mt-2"
                />
                <Button
                  onClick={() => act(() => adminApi.setOrderNotes(id, notes))}
                  disabled={busy}
                  size="sm"
                  className="mt-3 w-full"
                >
                  {t('save')}
                </Button>
              </Card>

              <Card className="p-5">
                <h3 className="mb-3 text-sm font-semibold">{t('actions')}</h3>
                <div className="grid gap-2">
                  <Button
                    onClick={() => act(() => adminApi.releasePayout(id))}
                    disabled={
                      busy || detail.payoutStatus === 'released' || detail.payoutStatus === 'reversed'
                    }
                    variant="outline"
                  >
                    {t('releasePayout')}
                  </Button>
                  <Button onClick={() => act(() => adminApi.pausePayout(id))} disabled={busy} variant="outline">
                    {t('pausePayout')}
                  </Button>
                  <Button onClick={() => act(() => adminApi.markAbnormal(id))} disabled={busy} variant="outline">
                    {t('markAbnormal')}
                  </Button>
                </div>
              </Card>

              {detail.status === 'inDispute' || detail.status === 'refundInProgress' ? (
                <Card className="space-y-5 p-5">
                  <h3 className="text-sm font-semibold">{t('resolve')}</h3>

                  {detail.disputeReason ? (
                    <div className="rounded-lg border border-warning/40 bg-warning/10 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-warning-foreground dark:text-warning">
                        {t('disputeReason')}
                      </p>
                      <p className="mt-1 text-sm">{detail.disputeReason}</p>
                    </div>
                  ) : null}

                  <div>
                    <h4 className="mb-2 text-sm font-semibold">{t('chatTranscript')}</h4>
                    <div className="overflow-hidden rounded-lg border border-border">
                      <div className="flex items-center gap-3 border-b border-border bg-muted/40 px-4 py-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <Avatar src={detail.buyer?.avatarUrl} name={detail.buyer?.nickname} size={36} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {detail.buyer?.nickname ?? t('buyer')}
                            </p>
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                              {t('buyer')}
                            </p>
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
                            <p className="truncate text-sm font-medium">
                              {detail.seller?.nickname ?? t('seller')}
                            </p>
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                              {t('seller')}
                            </p>
                          </div>
                          <Avatar src={detail.seller?.avatarUrl} name={detail.seller?.nickname} size={36} />
                        </div>
                      </div>
                      {chat.length === 0 ? (
                        <p className="bg-background p-4 text-center text-sm text-muted-foreground">
                          {t('noItems')}
                        </p>
                      ) : (
                        <div className="flex max-h-96 flex-col gap-2 overflow-auto bg-background p-3">
                          {chat.map((m) => {
                            const isSeller = m.senderId === detail.seller?.id;
                            const time = m.sentAt
                              ? new Date(m.sentAt).toLocaleString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '';
                            return (
                              <div
                                key={m.id}
                                className={cn('flex', isSeller ? 'justify-end' : 'justify-start')}
                              >
                                <div
                                  className={cn(
                                    'max-w-[78%] rounded-lg px-3 py-2',
                                    isSeller ? 'border border-primary/20 bg-primary/15' : 'bg-muted',
                                  )}
                                >
                                  <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                                    {m.text}
                                  </p>
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
                    <Label htmlFor="dispute-note" className="text-sm font-semibold">
                      {t('handlingNote')}
                    </Label>
                    <Textarea
                      id="dispute-note"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="mt-2"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Button onClick={() => act(() => adminApi.resolveDispute(id, 'refund', notes))} disabled={busy}>
                      {t('resolveRefund')}
                    </Button>
                    <Button onClick={() => act(() => adminApi.resolveDispute(id, 'complete', notes))} disabled={busy}>
                      {t('resolveComplete')}
                    </Button>
                  </div>
                </Card>
              ) : null}
            </div>
          </div>
        </>
      )}
      <ImageLightbox src={previewSrc} onClose={() => setPreviewSrc(null)} />
    </AppShell>
  );
}
