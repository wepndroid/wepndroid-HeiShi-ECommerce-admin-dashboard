import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Check, Pin, Star, Tag, Trash2, X } from 'lucide-react';
import { adminApi, type ContentDetail, type ContentReportRow, type ProductTagRow } from '@/api/client';
import { useI18n } from '@/i18n';
import { AppShell } from '@/components/admin/AppShell';
import { PageHeader } from '@/components/admin/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { FormModal, type ModalConfig } from '@/components/admin/FormModal';

export default function ContentDetailPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { listingId } = useParams<{ listingId: string }>();
  const id = Number(listingId!);
  const [detail, setDetail] = useState<ContentDetail | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<ModalConfig | null>(null);
  const [tags, setTags] = useState<ProductTagRow[]>([]);
  const [reports, setReports] = useState<ContentReportRow[]>([]);

  const load = useCallback(() => {
    adminApi.contentDetail(id).then((d) => {
      setDetail(d);
      setReviewNote(d.reviewNote ?? '');
    })
      .catch((err) => setError(err instanceof Error ? err.message : t('error')));
  }, [id, t]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    adminApi.productTags().then((res) => setTags(res.items)).catch(() => {});
    adminApi.contentReports(id).then((res) => setReports(res.items)).catch(() => {});
  }, [id]);

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    try { await fn(); load(); }
    catch (err) { setError(err instanceof Error ? err.message : t('error')); }
    finally { setBusy(false); }
  }

  function rejectContent() {
    setModal({
      title: t('reject'),
      destructive: true,
      submitLabel: t('reject'),
      fields: [{ name: 'reason', label: t('rejectReason'), kind: 'textarea', required: true }],
      onSubmit: async (v) => { await act(() => adminApi.rejectContent(id, v.reason.trim())); },
    });
  }
  function changeCategory() {
    setModal({
      title: t('changeCategory'),
      submitLabel: t('save'),
      fields: [{ name: 'categoryKey', label: t('key'), initialValue: detail?.categoryKey ?? '', required: true }],
      onSubmit: async (v) => { await act(() => adminApi.editContent(id, { categoryKey: v.categoryKey.trim() })); },
    });
  }
  function setTag() {
    setModal({
      title: t('setTag'),
      submitLabel: t('save'),
      fields: [
        {
          name: 'tagKey',
          label: t('tags'),
          kind: 'select',
          initialValue: detail?.tagKey ?? '',
          options: [
            { value: '', label: t('noTag') },
            ...tags.map((tg) => ({ value: tg.key, label: tg.labelEn })),
          ],
        },
      ],
      onSubmit: async (v) => { await act(() => adminApi.setContentTags(id, v.tagKey)); },
    });
  }
  async function deleteListing() {
    if (!window.confirm(t('confirmDeleteListing'))) return;
    setBusy(true);
    try {
      await adminApi.deleteContent(id);
      navigate('/content');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title={detail?.title ?? t('loading')} description={t('contentDetailDesc')}>
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to="/content"><ArrowLeft className="h-4 w-4" />{t('back')}</Link>
      </Button>
      {error ? <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
      {!detail ? <p className="text-muted-foreground">{t('loading')}</p> : (
        <>
          <PageHeader
            title={detail.title}
            description={`${detail.type} · ${detail.city} / ${detail.area} · $${detail.price}`}
            actions={
              <>
                <StatusBadge status={detail.reviewStatus} />
                {detail.status ? <StatusBadge status={detail.status} /> : null}
              </>
            }
          />

          <div className="space-y-4">
              {detail.matchedKeywords?.length || detail.riskLevel === 'high' ? (
                <Card className="border-destructive/40 bg-destructive/5 p-5">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-destructive">
                    <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">{t('riskHigh')}</span>
                    {t('highRiskManualReview')}
                  </h3>
                  {detail.matchedKeywords?.length ? (
                    <div className="mt-3">
                      <p className="mb-1.5 text-xs text-muted-foreground">{t('matchedKeywords')}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {detail.matchedKeywords.map((kw) => (
                          <span key={kw} className="inline-flex items-center rounded bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">{kw}</span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </Card>
              ) : null}

              <Card className="p-5">
                <h3 className="mb-3 text-sm font-semibold">{t('description')}</h3>
                <p className="whitespace-pre-line text-sm text-muted-foreground">{detail.description}</p>
                {detail.images.length > 0 && (
                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {detail.images.map((url) => (
                      <a key={url} href={url} target="_blank" rel="noreferrer">
                        <img src={url} alt="" className="aspect-square w-full rounded-lg border border-border object-cover" />
                      </a>
                    ))}
                  </div>
                )}
              </Card>

              {detail.bundleMeta && detail.bundleMeta.items.length > 0 ? (
                <Card className="p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">{t('bundleItems')}</h3>
                    <span className="text-xs text-muted-foreground">
                      {t('allowSeparateSale')}: {detail.bundleMeta.allowSeparateSale ? t('yes') : t('no')}
                    </span>
                  </div>
                  <ul className="divide-y divide-border">
                    {detail.bundleMeta.items.map((it, i) => (
                      <li key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
                        <span className="font-medium">{it.title}</span>
                        <span className="flex items-center gap-3">
                          <span className="text-muted-foreground">
                            ${it.sharePrice}
                            {it.separatePrice != null ? ` · $${it.separatePrice} ${t('separatePrice')}` : ''}
                          </span>
                          <StatusBadge status={it.status} />
                        </span>
                      </li>
                    ))}
                  </ul>
                  {detail.bundleMeta.pickupWindow || detail.bundleMeta.pickupDeadline ? (
                    <dl className="mt-3 space-y-1.5 border-t border-border pt-3 text-xs">
                      {detail.bundleMeta.pickupWindow ? (
                        <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{t('pickupWindow')}</dt><dd className="text-right">{detail.bundleMeta.pickupWindow}</dd></div>
                      ) : null}
                      {detail.bundleMeta.pickupDeadline ? (
                        <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{t('pickupDeadline')}</dt><dd className="text-right">{new Date(detail.bundleMeta.pickupDeadline).toLocaleString()}</dd></div>
                      ) : null}
                    </dl>
                  ) : null}
                </Card>
              ) : null}

              <Card className="p-5">
                <h3 className="mb-3 text-sm font-semibold">{t('reportRecords')}</h3>
                {reports.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('noReportsForListing')}</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {reports.map((r) => (
                      <li key={r.id} className="flex items-start justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{r.reason}</p>
                          {r.details ? (
                            <p className="mt-0.5 text-sm text-muted-foreground">{r.details}</p>
                          ) : null}
                          <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                            {r.reporter ? (
                              <span className="flex items-center gap-1.5">
                                <Avatar src={r.reporter.avatarUrl} name={r.reporter.nickname} size={20} />
                                {r.reporter.nickname}
                              </span>
                            ) : null}
                            <span>{r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}</span>
                          </div>
                        </div>
                        <StatusBadge status={r.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Card className="p-5">
                <h3 className="mb-3 text-sm font-semibold">{t('attributes')}</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-muted-foreground">{t('type')}</dt><dd className="font-medium capitalize">{detail.type}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">{t('category')}</dt><dd className="font-medium">{detail.categoryKey ?? '—'}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">{t('tags')}</dt><dd className="font-medium">{detail.tagKey ?? '—'}</dd></div>
                  {detail.conditionKey ? (
                    <div className="flex justify-between"><dt className="text-muted-foreground">{t('condition')}</dt><dd className="font-medium">{detail.conditionKey}</dd></div>
                  ) : null}
                  {detail.serviceIcon ? (
                    <div className="flex justify-between"><dt className="text-muted-foreground">{t('serviceType')}</dt><dd className="font-medium">{detail.serviceIcon}</dd></div>
                  ) : null}
                  <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{t('location')}</dt><dd className="text-right font-medium">{detail.locationLabel ?? `${detail.city} / ${detail.area}`}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">{t('price')}</dt><dd className="font-medium">${detail.price} {detail.currency}</dd></div>
                </dl>
              </Card>

              <Card className="p-5">
                <h3 className="mb-3 text-sm font-semibold">{t('tradeOptions')}</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-muted-foreground">{t('negotiable')}</dt><dd className="font-medium">{detail.negotiable ? t('yes') : t('no')}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">{t('escrow')}</dt><dd className="font-medium">{detail.escrowSupported ? t('yes') : t('no')}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">{t('meetInPublic')}</dt><dd className="font-medium">{detail.meetInPublic ? t('yes') : t('no')}</dd></div>
                  {detail.pickupMethods?.length ? (
                    <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{t('pickupMethods')}</dt><dd className="text-right font-medium">{detail.pickupMethods.join(', ')}</dd></div>
                  ) : null}
                  {detail.type === 'job' ? (
                    <div className="flex justify-between"><dt className="text-muted-foreground">{t('merchantPost')}</dt><dd className="font-medium">{detail.merchantPost ? t('yes') : t('no')}</dd></div>
                  ) : null}
                </dl>
              </Card>

              <Card className="p-5">
                <h3 className="mb-3 text-sm font-semibold">{t('publisher')}</h3>
                <div className="mb-3 flex items-center gap-3">
                  <Avatar src={detail.publisher?.avatarUrl} name={detail.publisher?.nickname} size={44} />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{detail.publisher?.nickname ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">{detail.publisherCity ?? '—'}</p>
                  </div>
                </div>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-muted-foreground">{t('nickname')}</dt><dd className="font-medium">{detail.publisher?.nickname ?? '—'}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">{t('phone')}</dt><dd>{detail.publisher?.phone ?? '—'}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">{t('city')}</dt><dd>{detail.publisherCity ?? '—'}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">{t('completedTrades')}</dt><dd className="font-medium">{detail.sellerTrades}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">{t('positiveRating')}</dt><dd className="font-medium">{detail.sellerRating}%</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">{t('verified')}</dt><dd className="font-medium">{detail.sellerVerified ? t('yes') : t('no')}</dd></div>
                </dl>
              </Card>

              <Card className="p-5">
                <h3 className="mb-3 text-sm font-semibold">{t('engagement')}</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-muted-foreground">{t('views')}</dt><dd className="font-medium tabular-nums">{(detail.viewCount ?? 0).toLocaleString()}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">{t('favorites')}</dt><dd className="font-medium tabular-nums">{(detail.favoriteCount ?? 0).toLocaleString()}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{t('createdAt')}</dt><dd className="text-right">{detail.createdAt ? new Date(detail.createdAt).toLocaleString() : '—'}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{t('updatedAt')}</dt><dd className="text-right">{detail.updatedAt ? new Date(detail.updatedAt).toLocaleString() : '—'}</dd></div>
                </dl>
              </Card>

              <Card className="p-5">
                <h3 className="mb-2 text-sm font-semibold">{t('reviewNote')}</h3>
                <Textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} rows={3} />
                <Button
                  onClick={() => act(() => adminApi.setContentNote(id, reviewNote))}
                  disabled={busy}
                  size="sm"
                  className="mt-3 w-full"
                >
                  {t('save')}
                </Button>
              </Card>

              <Card className="p-5">
                <h3 className="mb-3 text-sm font-semibold">{t('actions')}</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={() => act(() => adminApi.approveContent(id))} disabled={busy}><Check className="h-4 w-4" />{t('approve')}</Button>
                  <Button onClick={rejectContent} disabled={busy} variant="destructive"><X className="h-4 w-4" />{t('reject')}</Button>
                  <Button onClick={() => act(() => adminApi.removeContent(id))} disabled={busy} variant="outline"><Trash2 className="h-4 w-4" />{t('remove')}</Button>
                  <Button onClick={() => act(() => adminApi.restoreContent(id))} disabled={busy} variant="outline">{t('restore')}</Button>
                  <Button onClick={() => act(() => adminApi.setContentFlags(id, { pinned: !detail.isPinned }))} disabled={busy} variant="ghost"><Pin className="h-4 w-4" />{detail.isPinned ? t('unpin') : t('pin')}</Button>
                  <Button onClick={() => act(() => adminApi.setContentFlags(id, { recommended: !detail.isRecommended }))} disabled={busy} variant="ghost"><Star className="h-4 w-4" />{detail.isRecommended ? t('unrecommend') : t('recommend')}</Button>
                  <Button onClick={changeCategory} disabled={busy} variant="ghost" className="col-span-2">{t('changeCategory')}</Button>
                  <Button onClick={setTag} disabled={busy} variant="ghost" className="col-span-2"><Tag className="h-4 w-4" />{t('setTag')}</Button>
                  <Button onClick={deleteListing} disabled={busy} variant="destructive" className="col-span-2"><Trash2 className="h-4 w-4" />{t('deleteListing')}</Button>
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
      <FormModal config={modal} onClose={() => setModal(null)} />
    </AppShell>
  );
}
