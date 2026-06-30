import { Link, useParams } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { adminApi, type ReportDetail } from '@/api/client';
import { useI18n } from '@/i18n';
import { AppShell } from '@/components/admin/AppShell';
import { PageHeader } from '@/components/admin/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/admin/StatusBadge';

export default function ReportDetailPage() {
  const { t } = useI18n();
  const { reportId } = useParams<{ reportId: string }>();
  const [detail, setDetail] = useState<ReportDetail | null>(null);
  const [chat, setChat] = useState<{ senderId: string; text: string; sentAt: string | null }[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    adminApi.report(reportId!).then(setDetail)
      .catch((err) => setError(err instanceof Error ? err.message : t('error')));
    adminApi.chatTranscript(reportId!).then((res) => setChat(res.messages)).catch(() => setChat([]));
  }, [reportId, t]);
  useEffect(() => { load(); }, [load]);

  async function action(actionType: string) {
    const note = window.prompt(t('handlingNote')) ?? '';
    setBusy(true);
    try { await adminApi.reportAction(reportId!, actionType, note); load(); }
    catch (err) { setError(err instanceof Error ? err.message : t('error')); }
    finally { setBusy(false); }
  }

  return (
    <AppShell title={`${t('reportPrefix')} ${reportId!.slice(0, 8)}`} description={t('reportDetailDesc')}>
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to="/reports"><ArrowLeft className="h-4 w-4" />{t('back')}</Link>
      </Button>
      {error ? <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
      {!detail ? <p className="text-muted-foreground">{t('loading')}</p> : (
        <>
          <PageHeader
            title={`${detail.targetType} #${detail.targetId}`}
            description={detail.reason}
            actions={<StatusBadge status={detail.status} />}
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2 p-5">
              {detail.details ? <p className="mb-4 text-sm text-foreground">{detail.details}</p> : null}
              {detail.evidenceUrls.length > 0 && (
                <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {detail.evidenceUrls.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer">
                      <img src={url} alt={t('evidence')} className="aspect-square w-full rounded-lg border border-border object-cover" />
                    </a>
                  ))}
                </div>
              )}
              {chat.length > 0 && (
                <>
                  <h3 className="mb-3 text-sm font-semibold">{t('chatTranscript')}</h3>
                  <div className="max-h-80 overflow-auto rounded-lg border border-border bg-muted/30 p-4">
                    <ul className="space-y-2 text-sm">
                      {chat.map((m, i) => (
                        <li key={`${m.sentAt}-${i}`}>
                          <span className="font-mono text-xs text-muted-foreground">{m.senderId.slice(0, 8)}</span>{' '}
                          <span>{m.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </Card>

            <div className="space-y-4">
              <Card className="p-5">
                <h3 className="mb-3 text-sm font-semibold">{t('parties')}</h3>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">{t('reporter')}</dt>
                    <dd className="font-medium">{detail.reporter.nickname} <span className="text-muted-foreground">({detail.reporter.phone})</span></dd>
                  </div>
                  {detail.reportedUser && (
                    <div>
                      <dt className="text-xs text-muted-foreground">{t('reportedUser')}</dt>
                      <dd className="font-medium">{detail.reportedUser.nickname} <span className="text-muted-foreground">({detail.reportedUser.phone})</span></dd>
                    </div>
                  )}
                </dl>
              </Card>

              <Card className="p-5">
                <h3 className="mb-3 text-sm font-semibold">{t('takeAction')}</h3>
                <div className="grid gap-2">
                  <Button onClick={() => action('ignore')} disabled={busy} variant="outline">{t('ignore')}</Button>
                  <Button onClick={() => action('warn')} disabled={busy} variant="outline">{t('warn')}</Button>
                  <Button onClick={() => action('remove_content')} disabled={busy} variant="outline">{t('removeContent')}</Button>
                  <Button onClick={() => action('restore_content')} disabled={busy} variant="outline">{t('restoreContent')}</Button>
                  <Button onClick={() => action('ban_user')} disabled={busy} variant="destructive">{t('banUser')}</Button>
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
