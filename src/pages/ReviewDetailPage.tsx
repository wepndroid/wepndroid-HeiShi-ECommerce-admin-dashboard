import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { adminApi, type ReviewDetail } from '@/api/client';
import { useI18n } from '@/i18n';
import { AppShell } from '@/components/admin/AppShell';
import { PageHeader } from '@/components/admin/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/admin/StatusBadge';

export default function ReviewDetailPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { reviewId } = useParams<{ reviewId: string }>();
  const [detail, setDetail] = useState<ReviewDetail | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    adminApi
      .review(reviewId!)
      .then(setDetail)
      .catch((err) => setError(err instanceof Error ? err.message : t('error')));
  }, [reviewId, t]);
  useEffect(() => { load(); }, [load]);

  async function toggleHidden(hidden: boolean) {
    setBusy(true);
    setError('');
    try {
      if (hidden) await adminApi.unhideReview(reviewId!);
      else await adminApi.hideReview(reviewId!);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(t('confirmDeleteReview'))) return;
    setBusy(true);
    setError('');
    try {
      await adminApi.deleteReview(reviewId!);
      navigate('/reviews');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
      setBusy(false);
    }
  }

  const fmtDate = (v: string | null) => (v ? new Date(v).toLocaleString() : '—');

  const subRating = (label: string, value: number | null) =>
    value === null ? null : (
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-amber-500">★ {value}/5</span>
      </div>
    );

  const party = (label: string, p: ReviewDetail['reviewer']) => (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 flex items-center gap-2 font-medium">
        {p ? (
          <>
            <Avatar src={p.avatarUrl} name={p.nickname} size={32} />
            <span>
              {p.nickname}
              {p.phone ? <span className="text-muted-foreground"> ({p.phone})</span> : null}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </dd>
    </div>
  );

  return (
    <AppShell title={t('reviewsNav')} description={t('reviewDetailDesc')}>
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to="/reviews"><ArrowLeft className="h-4 w-4" />{t('back')}</Link>
      </Button>
      {error ? (
        <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      ) : null}
      {!detail ? (
        <p className="text-muted-foreground">{t('loading')}</p>
      ) : (
        <>
          <PageHeader
            title={`${t('orderPrefix')} #${detail.orderId}`}
            description={detail.listingTitle ?? undefined}
            actions={
              detail.isRemoved ? (
                <StatusBadge status="removed" />
              ) : detail.isHidden ? (
                <span className="text-xs text-muted-foreground">{t('hidden')}</span>
              ) : (
                <StatusBadge status="approved" />
              )
            }
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <Card className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-2xl font-semibold text-amber-500">★ {detail.rating}/5</span>
                  <span className="text-xs text-muted-foreground">{fmtDate(detail.createdAt)}</span>
                </div>
                {detail.comment ? (
                  <p className="mt-3 whitespace-pre-line text-sm text-foreground">{detail.comment}</p>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">—</p>
                )}

                {(detail.qualityRating !== null ||
                  detail.communicationRating !== null ||
                  detail.expertiseRating !== null ||
                  detail.professionalismRating !== null ||
                  detail.hireAgainRating !== null) && (
                  <div className="mt-4 space-y-2 border-t border-border pt-4">
                    {subRating('Quality', detail.qualityRating)}
                    {subRating('Communication', detail.communicationRating)}
                    {subRating('Expertise', detail.expertiseRating)}
                    {subRating('Professionalism', detail.professionalismRating)}
                    {subRating('Hire again', detail.hireAgainRating)}
                  </div>
                )}

                {detail.adminNote ? (
                  <div className="mt-4 border-t border-border pt-4">
                    <p className="text-xs text-muted-foreground">{t('handlingNote')}</p>
                    <p className="mt-1 whitespace-pre-line text-sm text-foreground">{detail.adminNote}</p>
                  </div>
                ) : null}
              </Card>

              <Card className="p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">{t('relatedListing')}</h3>
                  {detail.listing ? (
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/products/${detail.listing.id}`}>{t('viewInContentReview')}</Link>
                    </Button>
                  ) : null}
                </div>
                {detail.listing ? (
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="text-base font-semibold text-foreground">{detail.listing.title}</h4>
                      <StatusBadge status={detail.listing.reviewStatus} />
                    </div>
                    <p className="text-lg font-semibold text-foreground">AUD {detail.listing.price}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </Card>
            </div>

            <div className="space-y-4">
              <Card className="p-5">
                <h3 className="mb-3 text-sm font-semibold">{t('reviewerLabel')} / {t('revieweeLabel')}</h3>
                <dl className="space-y-3 text-sm">
                  {party(t('reviewerLabel'), detail.reviewer)}
                  {party(t('revieweeLabel'), detail.reviewee)}
                </dl>
              </Card>

              <Card className="p-5">
                <h3 className="mb-3 text-sm font-semibold">{t('actions')}</h3>
                <div className="grid gap-2">
                  <Button
                    onClick={() => toggleHidden(detail.isHidden)}
                    disabled={busy}
                    variant="outline"
                    className="hover:border-[#7ad80b] hover:bg-[#7ad80b] hover:text-black"
                  >
                    {detail.isHidden ? t('unhide') : t('hide')}
                  </Button>
                  <Button onClick={remove} disabled={busy} variant="destructive">
                    {t('deleteReview')}
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
