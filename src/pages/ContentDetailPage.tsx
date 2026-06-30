import { Link, useParams } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Check, Pin, Star, Trash2, X } from 'lucide-react';
import { adminApi, type ContentDetail } from '@/api/client';
import { useI18n } from '@/i18n';
import { AppShell } from '@/components/admin/AppShell';
import { PageHeader } from '@/components/admin/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/admin/StatusBadge';

export default function ContentDetailPage() {
  const { t } = useI18n();
  const { listingId } = useParams<{ listingId: string }>();
  const id = Number(listingId!);
  const [detail, setDetail] = useState<ContentDetail | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    adminApi.contentDetail(id).then((d) => {
      setDetail(d);
      setReviewNote(d.reviewNote ?? '');
    })
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

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2 p-5">
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

            <div className="space-y-4">
              <Card className="p-5">
                <h3 className="mb-3 text-sm font-semibold">{t('publisher')}</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-muted-foreground">{t('nickname')}</dt><dd className="font-medium">{detail.publisher ?? '—'}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">{t('phone')}</dt><dd>{detail.publisherPhone ?? '—'}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">{t('city')}</dt><dd>{detail.publisherCity ?? '—'}</dd></div>
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
                  <Button onClick={() => { const r = window.prompt(t('rejectReason')); if (r?.trim()) act(() => adminApi.rejectContent(id, r.trim())); }} disabled={busy} variant="destructive"><X className="h-4 w-4" />{t('reject')}</Button>
                  <Button onClick={() => act(() => adminApi.removeContent(id))} disabled={busy} variant="outline"><Trash2 className="h-4 w-4" />{t('remove')}</Button>
                  <Button onClick={() => act(() => adminApi.restoreContent(id))} disabled={busy} variant="outline">{t('restore')}</Button>
                  <Button onClick={() => act(() => adminApi.setContentFlags(id, { pinned: !detail.isPinned }))} disabled={busy} variant="ghost"><Pin className="h-4 w-4" />{detail.isPinned ? t('unpin') : t('pin')}</Button>
                  <Button onClick={() => act(() => adminApi.setContentFlags(id, { recommended: !detail.isRecommended }))} disabled={busy} variant="ghost"><Star className="h-4 w-4" />{detail.isRecommended ? t('unrecommend') : t('recommend')}</Button>
                  <Button onClick={() => { const n = window.prompt(t('key'), detail.categoryKey ?? ''); if (n?.trim()) act(() => adminApi.editContent(id, { categoryKey: n.trim() })); }} disabled={busy} variant="ghost" className="col-span-2">{t('changeCategory')}</Button>
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
