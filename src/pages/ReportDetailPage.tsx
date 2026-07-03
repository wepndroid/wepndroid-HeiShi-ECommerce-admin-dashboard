import { Link, useParams } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { adminApi, type ReportDetail } from '@/api/client';
import { useI18n } from '@/i18n';
import { AppShell } from '@/components/admin/AppShell';
import { PageHeader } from '@/components/admin/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { FormModal, type ModalConfig } from '@/components/admin/FormModal';

export default function ReportDetailPage() {
  const { t } = useI18n();
  const { reportId } = useParams<{ reportId: string }>();
  const [detail, setDetail] = useState<ReportDetail | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<ModalConfig | null>(null);
  const [note, setNote] = useState('');
  const [savedNote, setSavedNote] = useState(false);

  const load = useCallback(() => {
    adminApi.report(reportId!).then((d) => { setDetail(d); setNote(d.handlerNote ?? ''); })
      .catch((err) => setError(err instanceof Error ? err.message : t('error')));
  }, [reportId, t]);
  useEffect(() => { load(); }, [load]);

  async function saveNote() {
    setBusy(true);
    setError('');
    try {
      await adminApi.setReportNote(reportId!, note);
      setSavedNote(true);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    } finally {
      setBusy(false);
    }
  }

  function action(actionType: string, label: string, destructive = false) {
    setModal({
      title: label,
      description: t('handlingNote'),
      destructive,
      submitLabel: label,
      fields: [{ name: 'note', label: t('handlingNote'), kind: 'textarea' }],
      onSubmit: async (v) => {
        setBusy(true);
        try { await adminApi.reportAction(reportId!, actionType, v.note ?? ''); load(); }
        catch (err) { setError(err instanceof Error ? err.message : t('error')); throw err; }
        finally { setBusy(false); }
      },
    });
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
            </Card>

            <div className="space-y-4">
              <Card className="p-5">
                <h3 className="mb-3 text-sm font-semibold">{t('parties')}</h3>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">{t('reporter')}</dt>
                    <dd className="mt-1 flex items-center gap-2 font-medium">
                      <Avatar src={detail.reporter.avatarUrl} name={detail.reporter.nickname} size={32} />
                      <span>{detail.reporter.nickname} <span className="text-muted-foreground">({detail.reporter.phone})</span></span>
                    </dd>
                  </div>
                  {detail.reportedUser && (
                    <div>
                      <dt className="text-xs text-muted-foreground">{t('reportedUser')}</dt>
                      <dd className="mt-1 flex items-center gap-2 font-medium">
                        <Avatar src={detail.reportedUser.avatarUrl} name={detail.reportedUser.nickname} size={32} />
                        <span>{detail.reportedUser.nickname} <span className="text-muted-foreground">({detail.reportedUser.phone})</span></span>
                      </dd>
                    </div>
                  )}
                </dl>
              </Card>

              <Card className="p-5">
                <h3 className="mb-3 text-sm font-semibold">{t('takeAction')}</h3>
                <div className="grid gap-2">
                  <Button onClick={() => action('ignore', t('ignore'))} disabled={busy} variant="outline" className="hover:border-[#7ad80b] hover:bg-[#7ad80b] hover:text-black">{t('ignore')}</Button>
                  <Button onClick={() => action('warn', t('warn'))} disabled={busy} variant="outline" className="hover:border-[#7ad80b] hover:bg-[#7ad80b] hover:text-black">{t('warn')}</Button>
                  <Button onClick={() => action('remove_content', t('removeContent'))} disabled={busy} variant="outline" className="hover:border-[#7ad80b] hover:bg-[#7ad80b] hover:text-black">{t('removeContent')}</Button>
                  <Button onClick={() => action('restore_content', t('restoreContent'))} disabled={busy} variant="outline" className="hover:border-[#7ad80b] hover:bg-[#7ad80b] hover:text-black">{t('restoreContent')}</Button>
                  <Button onClick={() => action('ban_user', t('banUser'), true)} disabled={busy} variant="destructive">{t('banUser')}</Button>
                </div>
              </Card>

              <Card className="p-5">
                <Label htmlFor="report-note" className="text-sm font-semibold">{t('handlingNote')}</Label>
                <Textarea
                  id="report-note"
                  value={note}
                  onChange={(e) => { setNote(e.target.value); setSavedNote(false); }}
                  rows={4}
                  placeholder={t('notePlaceholder')}
                  className="mt-2"
                />
                <div className="mt-3 flex items-center gap-3">
                  <Button onClick={saveNote} disabled={busy} size="sm">{t('saveNote')}</Button>
                  {savedNote ? <span className="text-xs text-muted-foreground">{t('noteSaved')}</span> : null}
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
