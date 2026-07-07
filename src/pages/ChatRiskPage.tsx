import { useCallback, useEffect, useState } from 'react';
import { MessageSquareWarning, ShieldAlert } from 'lucide-react';
import { adminApi, type FlaggedMessage, type ReportDetail, type ReportRow } from '@/api/client';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import { AppShell } from '@/components/admin/AppShell';
import { PageHeader } from '@/components/admin/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable, TBody, TD, TH, THead, TR } from '@/components/admin/DataTable';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { EmptyState } from '@/components/admin/EmptyState';
import { FormModal, type ModalConfig } from '@/components/admin/FormModal';

type TranscriptMessage = { senderId: string; text: string; sentAt: string | null };

const isChatReport = (r: ReportRow) => r.targetType === 'chat';

const fmtTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

export default function ChatRiskPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<ReportRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ReportDetail | null>(null);
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [loadingPanel, setLoadingPanel] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<ModalConfig | null>(null);
  const [flagged, setFlagged] = useState<FlaggedMessage[]>([]);
  const [flaggedLoaded, setFlaggedLoaded] = useState(false);

  const loadFlagged = useCallback(async () => {
    const res = await adminApi.chatFlagged();
    setFlagged(res.items);
    setFlaggedLoaded(true);
  }, []);

  // Load flagged messages the first time the sensitive-word tab is shown.
  function onTabChange(value: string) {
    if (value === 'flagged' && !flaggedLoaded) {
      loadFlagged().catch((err) => setError(err instanceof Error ? err.message : t('error')));
    }
  }

  const loadList = useCallback(async () => {
    const res = await adminApi.reports();
    const chats = res.items.filter(isChatReport);
    setItems(chats);
    return chats;
  }, []);

  useEffect(() => {
    loadList()
      .then((chats) => setSelectedId((cur) => (cur != null && chats.some((c) => c.id === cur) ? cur : chats[0]?.id ?? null)))
      .catch((err) => setError(err instanceof Error ? err.message : t('error')));
  }, [loadList, t]);

  useEffect(() => {
    if (selectedId == null) {
      setDetail(null);
      setMessages([]);
      return;
    }
    setLoadingPanel(true);
    // Resolve the reported user (for muting) alongside the stored conversation transcript.
    Promise.all([adminApi.report(selectedId), adminApi.chatTranscript(selectedId)])
      .then(([d, tx]) => {
        setDetail(d);
        setMessages(tx.messages);
      })
      .catch((err) => {
        setDetail(null);
        setMessages([]);
        setError(err instanceof Error ? err.message : t('error'));
      })
      .finally(() => setLoadingPanel(false));
  }, [selectedId, t]);

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await fn();
      const chats = await loadList();
      if (selectedId != null && !chats.some((c) => c.id === selectedId)) {
        setSelectedId(chats[0]?.id ?? null);
      } else if (selectedId != null) {
        const d = await adminApi.report(selectedId);
        setDetail(d);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    } finally {
      setBusy(false);
    }
  }

  function openMute(userId: string) {
    setModal({
      title: t('mute'),
      description: t('reasonOptional'),
      submitLabel: t('mute'),
      fields: [{ name: 'reason', label: t('reason'), kind: 'textarea', placeholder: t('notePlaceholder') }],
      onSubmit: async (v) => {
        try {
          await act(() => adminApi.muteUser(userId, v.reason ?? ''));
        } catch (err) {
          throw err instanceof Error ? err : new Error(t('error'));
        }
      },
    });
  }

  // Mute/unmute a flagged-message sender, then refetch the flagged list.
  async function flaggedAct(fn: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await fn();
      await loadFlagged();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    } finally {
      setBusy(false);
    }
  }

  function openMuteFlagged(userId: string) {
    setModal({
      title: t('mute'),
      description: t('reasonOptional'),
      submitLabel: t('mute'),
      fields: [{ name: 'reason', label: t('reason'), kind: 'textarea', placeholder: t('notePlaceholder') }],
      onSubmit: async (v) => {
        try {
          await flaggedAct(() => adminApi.muteUser(userId, v.reason ?? ''));
        } catch (err) {
          throw err instanceof Error ? err : new Error(t('error'));
        }
      },
    });
  }

  const reportedUser = detail?.reportedUser ?? null;

  return (
    <AppShell title={t('chatRisk')} description={t('chatRiskDesc')}>
      <PageHeader title={t('chatRisk')} description={t('chatRiskPageDesc')} />

      {/* Prominent warning banner: private off-platform trades cannot be protected. */}
      <Card className="mb-4 flex items-start gap-3 border-amber-500/40 bg-amber-500/10 p-4">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-sm text-amber-800 dark:text-amber-200">{t('privateTradeWarning')}</p>
      </Card>

      {error ? (
        <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      ) : null}

      <Tabs defaultValue="reports" onValueChange={onTabChange}>
        <TabsList>
          <TabsTrigger value="reports">{t('chatReportsTab')}</TabsTrigger>
          <TabsTrigger value="flagged">{t('sensitiveWordHits')}</TabsTrigger>
        </TabsList>

        {/* Tab 1: chat report queue + transcript + actions */}
        <TabsContent value="reports" className="mt-4">
      {items.length === 0 ? (
        <EmptyState icon={<MessageSquareWarning className="h-5 w-5" />} title={t('emptyChatReports')} description={t('chatRiskPageDesc')} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* LEFT: chat report queue */}
          <div className="space-y-2 lg:col-span-1">
            {items.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedId(r.id)}
                className={cn(
                  'w-full rounded-md border p-3 text-left transition-colors',
                  r.id === selectedId ? 'border-primary bg-accent' : 'border-border hover:bg-muted/40',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Avatar src={r.reporter?.avatarUrl} name={r.reporter?.nickname} size={22} />
                    <span className="truncate text-sm font-medium">{r.reporter?.nickname ?? '—'}</span>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">{r.reason}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{fmtTime(r.createdAt)}</p>
              </button>
            ))}
          </div>

          {/* RIGHT: transcript + actions */}
          <div className="lg:col-span-2">
            {loadingPanel && !detail ? (
              <Card className="p-5"><p className="text-sm text-muted-foreground">{t('loading')}</p></Card>
            ) : detail ? (
              <Card className="space-y-5 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold">{detail.reason}</h2>
                    {detail.details ? <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{detail.details}</p> : null}
                  </div>
                  <StatusBadge status={detail.status} />
                </div>

                {/* Parties: reporter and the reported user. */}
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {([
                    [t('reporter'), detail.reporter],
                    [t('reportedUser'), reportedUser],
                  ] as const).map(([k, party]) => (
                    <div key={k} className="rounded-md border border-border bg-muted/30 p-3">
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{k}</dt>
                      <dd className="mt-1 flex items-center gap-2 text-sm font-medium">
                        <Avatar src={party?.avatarUrl} name={party?.nickname} size={28} />
                        <span>{party?.nickname ?? '—'}</span>
                        {party?.phone ? <span className="text-xs text-muted-foreground">({party.phone})</span> : null}
                      </dd>
                    </div>
                  ))}
                </dl>

                {/* Reported conversation transcript. */}
                <div>
                  <h3 className="mb-2 text-sm font-semibold">{t('chatTranscript')}</h3>
                  <div className="overflow-hidden rounded-lg border border-border">
                    {messages.length === 0 ? (
                      <p className="bg-background p-4 text-center text-sm text-muted-foreground">{t('loading')}</p>
                    ) : (
                      <div className="flex max-h-96 flex-col gap-2 overflow-auto bg-background p-3">
                        {messages.map((m, i) => {
                          // Reporter's messages left (muted), the other party right (primary).
                          const isReporter = m.senderId === detail.reporter?.id;
                          return (
                            <div key={`${m.senderId}-${i}`} className={cn('flex', isReporter ? 'justify-start' : 'justify-end')}>
                              <div
                                className={cn(
                                  'max-w-[78%] rounded-lg px-3 py-2',
                                  isReporter ? 'bg-muted' : 'border border-primary/20 bg-primary/15',
                                )}
                              >
                                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{m.text}</p>
                                <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
                                  <span>{fmtTime(m.sentAt)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions: mute the reported user, warn, or resolve. */}
                <div>
                  <h3 className="mb-2 text-sm font-semibold">{t('takeAction')}</h3>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <Button
                      onClick={() => reportedUser && openMute(reportedUser.id)}
                      disabled={busy || !reportedUser}
                      variant="destructive"
                    >
                      {t('mute')}
                    </Button>
                    <Button onClick={() => act(() => adminApi.reportAction(detail.id, 'warn'))} disabled={busy} variant="outline">
                      {t('warn')}
                    </Button>
                    <Button onClick={() => act(() => adminApi.reportAction(detail.id, 'ignore'))} disabled={busy} variant="outline">
                      {t('ignore')}
                    </Button>
                  </div>
                  {reportedUser ? (
                    <Button
                      onClick={() => act(() => adminApi.unmuteUser(reportedUser.id))}
                      disabled={busy}
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                    >
                      {t('unmute')}
                    </Button>
                  ) : null}
                </div>
              </Card>
            ) : (
              <Card className="p-5"><p className="text-sm text-muted-foreground">{t('loading')}</p></Card>
            )}
          </div>
        </div>
      )}
        </TabsContent>

        {/* Tab 2: automated sensitive-word hits (敏感词命中) */}
        <TabsContent value="flagged" className="mt-4">
          {!flaggedLoaded ? (
            <Card className="p-5"><p className="text-sm text-muted-foreground">{t('loading')}</p></Card>
          ) : flagged.length === 0 ? (
            <EmptyState icon={<MessageSquareWarning className="h-5 w-5" />} title={t('emptyFlaggedMessages')} />
          ) : (
            <DataTable>
              <THead>
                <TH>{t('nickname')}</TH>
                <TH>{t('chatTranscript')}</TH>
                <TH>{t('matchedKeywords')}</TH>
                <TH>{t('createdAt')}</TH>
                <TH className="text-right">{t('actions')}</TH>
              </THead>
              <TBody>
                {flagged.map((m) => (
                  <TR key={m.id}>
                    <TD>
                      <div className="flex items-center gap-2">
                        <Avatar src={m.sender?.avatarUrl} name={m.sender?.nickname} size={24} />
                        <span className="truncate text-sm font-medium">{m.sender?.nickname ?? '—'}</span>
                        {m.senderMuted ? (
                          <span className="inline-flex items-center rounded-md bg-destructive/10 px-1.5 py-0.5 text-[11px] font-medium text-destructive ring-1 ring-inset ring-destructive/25">
                            {t('muted')}
                          </span>
                        ) : null}
                      </div>
                    </TD>
                    <TD className="max-w-md whitespace-pre-line text-sm">{m.text}</TD>
                    <TD>
                      <div className="flex flex-wrap gap-1">
                        {m.matched.map((w, i) => (
                          <span
                            key={`${m.id}-${i}`}
                            className="rounded border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 text-xs font-medium text-destructive"
                          >
                            {w}
                          </span>
                        ))}
                      </div>
                    </TD>
                    <TD className="text-xs text-muted-foreground">{m.sentAt ? fmtTime(m.sentAt) : '—'}</TD>
                    <TD className="text-right">
                      {m.senderMuted ? (
                        <Button onClick={() => flaggedAct(() => adminApi.unmuteUser(m.senderId))} disabled={busy} size="sm" variant="ghost">
                          {t('unmute')}
                        </Button>
                      ) : (
                        <Button onClick={() => openMuteFlagged(m.senderId)} disabled={busy} size="sm" variant="destructive">
                          {t('mute')}
                        </Button>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </DataTable>
          )}
        </TabsContent>
      </Tabs>

      <FormModal config={modal} onClose={() => setModal(null)} />
    </AppShell>
  );
}
