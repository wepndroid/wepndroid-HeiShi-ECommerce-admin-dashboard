import { Link, useParams } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Check, X } from 'lucide-react';
import { adminApi, type VerificationDetail } from '@/api/client';
import { useI18n } from '@/i18n';
import { AppShell } from '@/components/admin/AppShell';
import { PageHeader } from '@/components/admin/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { ImageLightbox } from '@/components/ui/image-lightbox';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { FormModal, type ModalConfig } from '@/components/admin/FormModal';

export default function VerificationDetailPage() {
  const { t } = useI18n();
  const { submissionId } = useParams<{ submissionId: string }>();
  const [detail, setDetail] = useState<VerificationDetail | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<ModalConfig | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  const load = useCallback(() => {
    adminApi.verification(submissionId!).then(setDetail)
      .catch((err) => setError(err instanceof Error ? err.message : t('error')));
  }, [submissionId, t]);
  useEffect(() => { load(); }, [load]);

  async function approve() {
    setBusy(true);
    try { await adminApi.approveVerification(submissionId!); load(); }
    catch (err) { setError(err instanceof Error ? err.message : t('error')); }
    finally { setBusy(false); }
  }
  function reject() {
    setModal({
      title: t('reject'),
      destructive: true,
      submitLabel: t('reject'),
      fields: [{ name: 'reason', label: t('rejectReason'), kind: 'textarea', required: true }],
      onSubmit: async (v) => {
        setBusy(true);
        try { await adminApi.rejectVerification(submissionId!, v.reason.trim()); load(); }
        catch (err) { setError(err instanceof Error ? err.message : t('error')); throw err; }
        finally { setBusy(false); }
      },
    });
  }

  return (
    <AppShell title={detail?.legalName ?? t('loading')} description={t('verificationDetailDesc')}>
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to="/verifications"><ArrowLeft className="h-4 w-4" />{t('back')}</Link>
      </Button>
      {error ? <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
      {!detail ? <p className="text-muted-foreground">{t('loading')}</p> : (
        <>
          <PageHeader
            leading={
              detail.avatarUrl ? (
                <button
                  type="button"
                  onClick={() => setPreviewSrc(detail.avatarUrl ?? null)}
                  aria-label={t('viewImage')}
                  className="rounded-full transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Avatar src={detail.avatarUrl} name={detail.nickname ?? detail.legalName} size={48} />
                </button>
              ) : (
                <Avatar src={detail.avatarUrl} name={detail.nickname ?? detail.legalName} size={48} />
              )
            }
            title={detail.legalName}
            description={`${detail.nickname ?? ''} · ${detail.phone ?? ''}`}
            actions={
              <div className="flex items-center gap-2">
                <StatusBadge status={detail.status} />
                {detail.status !== 'rejected' ? (
                  <Button onClick={reject} variant="outline" disabled={busy}><X className="h-4 w-4" />{t('reject')}</Button>
                ) : null}
                {detail.status !== 'approved' ? (
                  <Button onClick={approve} disabled={busy}><Check className="h-4 w-4" />{t('approve')}</Button>
                ) : null}
              </div>
            }
          />

          <Card className="mb-6 p-5">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                [t('nickname'), detail.nickname],
                [t('phone'), detail.phone],
                [t('status'), <StatusBadge key="status" status={detail.status} />],
                [t('businessName'), detail.businessName],
                [t('abn'), detail.abn],
                [t('idCountry'), detail.idCountry],
              ].map(([k, v], i) => v ? (
                <div key={i}>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">{k}</dt>
                  <dd className="mt-1 text-sm font-medium">{v}</dd>
                </div>
              ) : null)}
            </dl>
          </Card>

          {detail.status === 'rejected' ? (
            <Card className="mb-6 border-destructive/30 p-5">
              <h3 className="text-sm font-semibold text-foreground">{t('rejectReason')}</h3>
              <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                {detail.rejectionReason?.trim() || t('noReasonProvided')}
              </p>
              {detail.reviewedAt ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  {t('reviewedAt')}: {new Date(detail.reviewedAt).toLocaleString()}
                </p>
              ) : null}
            </Card>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: t('idFront'), url: detail.idFrontUrl },
              { label: t('idBack'), url: detail.idBackUrl },
              { label: t('businessReg'), url: detail.businessRegUrl },
            ].filter((x) => x.url).map((x) => (
              <Card key={x.label} className="overflow-hidden p-0">
                <button
                  type="button"
                  onClick={() => setPreviewSrc(x.url!)}
                  aria-label={t('viewImage')}
                  className="block w-full cursor-pointer transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <img src={x.url!} alt={x.label} className="aspect-[4/3] w-full object-cover" />
                </button>
                <p className="border-t bg-muted/30 px-3 py-2 text-xs font-medium">{x.label}</p>
              </Card>
            ))}
          </div>
        </>
      )}
      <FormModal config={modal} onClose={() => setModal(null)} />
      <ImageLightbox src={previewSrc} onClose={() => setPreviewSrc(null)} />
    </AppShell>
  );
}
