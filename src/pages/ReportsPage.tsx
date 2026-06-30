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
import { Badge } from '@/components/ui/badge';

function priorityFor(reason: string): 'high' | 'medium' | 'low' {
  const r = reason.toLowerCase();
  if (r.includes('fraud') || r.includes('scam') || r.includes('abuse') || r.includes('violence')) return 'high';
  if (r.includes('spam') || r.includes('misleading')) return 'medium';
  return 'low';
}

function priorityLabel(p: 'high' | 'medium' | 'low', t: ReturnType<typeof useI18n>['t']) {
  if (p === 'high') return t('priorityHigh');
  if (p === 'medium') return t('priorityMedium');
  return t('priorityLow');
}

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
            <TH>{t('priority')}</TH>
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
              return (
                <TR key={row.id}>
                  <TD>
                    <Badge variant="outline" className={
                      p === 'high' ? 'border-destructive/30 bg-destructive/10 text-destructive'
                        : p === 'medium' ? 'border-warning/40 bg-warning/15 text-warning-foreground dark:text-warning'
                        : 'border-border bg-muted text-muted-foreground'
                    }>{priorityLabel(p, t)}</Badge>
                  </TD>
                  <TD className="text-xs"><span className="rounded bg-muted px-1.5 py-0.5 font-mono">{row.targetType}</span> #{row.targetId}</TD>
                  <TD>{row.reporter}</TD>
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
