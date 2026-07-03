import { Link } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { Flag } from 'lucide-react';
import { adminApi, type ReportRow } from '@/api/client';
import { useI18n } from '@/i18n';
import { AppShell } from '@/components/admin/AppShell';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable, TBody, TD, TH, THead, TR } from '@/components/admin/DataTable';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { EmptyState } from '@/components/admin/EmptyState';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { Messages } from '@/i18n/en';

function priorityFor(reason: string): 'high' | 'medium' | 'low' {
  const r = reason.toLowerCase();
  if (r.includes('fraud') || r.includes('scam') || r.includes('abuse') || r.includes('violence')) return 'high';
  if (r.includes('spam') || r.includes('misleading')) return 'medium';
  return 'low';
}

const PRIORITY_DOT: Record<'high' | 'medium' | 'low', string> = {
  high: 'bg-destructive',
  medium: 'bg-warning',
  low: 'bg-muted-foreground/50',
};

const TARGET_LABEL: Record<string, keyof Messages> = {
  listing: 'reportTargetListing',
  service: 'reportTargetService',
  user: 'reportTargetUser',
  chat: 'reportTargetChat',
  order: 'reportTargetOrder',
};

export default function ReportsPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<ReportRow[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    adminApi.reports().then((res) => setItems(res.items))
      .catch((err) => setError(err instanceof Error ? err.message : t('error')));
  }, [t]);
  useEffect(() => { load(); }, [load]);

  return (
    <AppShell title={t('reports')} description={t('reportsDesc')}>
      <PageHeader title={t('reports')} description={t('reportsPageDesc')} />
      {error ? <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
      {items.length === 0 ? (
        <EmptyState icon={<Flag className="h-5 w-5" />} title={t('noItems')} description={t('emptyReports')} />
      ) : (
        <DataTable>
          <THead>
            <TH>{t('reportId')}</TH>
            <TH>{t('type')}</TH>
            <TH>{t('target')}</TH>
            <TH>{t('reporter')}</TH>
            <TH>{t('reason')}</TH>
            <TH>{t('status')}</TH>
            <TH>{t('createdAt')}</TH>
            <TH className="text-right">{t('actions')}</TH>
          </THead>
          <TBody>
            {items.map((row) => {
              const p = priorityFor(row.reason);
              const targetKey = TARGET_LABEL[row.targetType];
              return (
                <TR key={row.id}>
                  <TD className="font-mono text-xs">
                    <span className="flex items-center gap-1.5">
                      <span
                        className={cn('h-1.5 w-1.5 shrink-0 rounded-full', PRIORITY_DOT[p])}
                        title={t(p === 'high' ? 'priorityHigh' : p === 'medium' ? 'priorityMedium' : 'priorityLow')}
                        aria-hidden
                      />
                      #{row.id}
                    </span>
                  </TD>
                  <TD>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">
                      {targetKey ? t(targetKey) : row.targetType}
                    </span>
                  </TD>
                  <TD className="font-mono text-xs text-muted-foreground">#{row.targetId}</TD>
                  <TD>
                    <span className="flex items-center gap-2"><Avatar src={row.reporter.avatarUrl} name={row.reporter.nickname} size={24} />{row.reporter.nickname}</span>
                  </TD>
                  <TD className="max-w-[260px] truncate">{row.reason}</TD>
                  <TD><StatusBadge status={row.status} /></TD>
                  <TD className="text-muted-foreground">{row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}</TD>
                  <TD className="text-right">
                    <Button asChild size="sm" variant="ghost">
                      <Link to={`/reports/${row.id}`}>{t('review')}</Link>
                    </Button>
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </DataTable>
      )}
    </AppShell>
  );
}
