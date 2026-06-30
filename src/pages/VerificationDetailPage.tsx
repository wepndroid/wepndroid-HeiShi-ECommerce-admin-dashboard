import { Link, useParams } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Check, X } from 'lucide-react';
import { adminApi, type VerificationDetail } from '@/api/client';
import { useI18n } from '@/i18n';
import { AppShell } from '@/components/admin/AppShell';
import { PageHeader } from '@/components/admin/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/admin/StatusBadge';

export default function VerificationDetailPage() {
  const { t } = useI18n();
  const { submissionId } = useParams<{ submissionId: string }>();
  const [detail, setDetail] = useState<VerificationDetail | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

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
  async function reject() {
    const reason = window.prompt(t('rejectReason'));
    if (!reason?.trim()) return;
    setBusy(true);
    try { await adminApi.rejectVerification(submissionId!, reason.trim()); load(); }
    catch (err) { setError(err instanceof Error ? err.message : t('error')); }
    finally { setBusy(false); }
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
            title={detail.legalName}
            description={`${detail.nickname ?? ''} · ${detail.phone ?? ''}`}
            actions={
              detail.status === 'pending' ? (
                <>
                  <Button onClick={reject} variant="outline" disabled={busy}><X className="h-4 w-4" />{t('reject')}</Button>
                  <Button onClick={approve} disabled={busy}><Check className="h-4 w-4" />{t('approve')}</Button>
                </>
              ) : <StatusBadge status={detail.status} />
            }
          />

          <Card className="mb-6 p-5">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                [t('nickname'), detail.nickname],
                [t('phone'), detail.phone],
                [t('status'), <StatusBadge status={detail.status} />],
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: t('idFront'), url: detail.idFrontUrl },
              { label: t('idBack'), url: detail.idBackUrl },
              { label: t('businessReg'), url: detail.businessRegUrl },
            ].filter((x) => x.url).map((x) => (
              <Card key={x.label} className="overflow-hidden p-0">
                <a href={x.url!} target="_blank" rel="noreferrer" className="block">
                  <img src={x.url!} alt={x.label} className="aspect-[4/3] w-full object-cover" />
                </a>
                <p className="border-t bg-muted/30 px-3 py-2 text-xs font-medium">{x.label}</p>
              </Card>
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
