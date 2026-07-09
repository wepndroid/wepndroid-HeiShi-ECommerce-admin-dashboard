import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, type ReviewRow } from '@/api/client';
import { useI18n } from '@/i18n';
import { AppShell } from '@/components/admin/AppShell';
import { PageHeader } from '@/components/admin/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable, TBody, TD, TH, THead, TR } from '@/components/admin/DataTable';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { Avatar } from '@/components/ui/avatar';

type Filter = 'all' | 'visible' | 'hidden' | 'removed';

const FILTERS: Filter[] = ['all', 'visible', 'hidden', 'removed'];

export default function ReviewsPage() {
  const { t } = useI18n();
  const [filter, setFilter] = useState<Filter>('all');
  const [rows, setRows] = useState<ReviewRow[] | null>(null);
  const [error, setError] = useState('');

  const filterLabel = (f: Filter) =>
    f === 'all' ? t('filterAll') : f === 'visible' ? t('filterVisible') : f === 'hidden' ? t('filterHidden') : t('filterRemoved');

  const load = useCallback(() => {
    setRows(null);
    setError('');
    adminApi
      .reviews(filter)
      .then((res) => setRows(res.items))
      .catch((err) => setError(err instanceof Error ? err.message : t('error')));
  }, [filter, t]);
  useEffect(() => { load(); }, [load]);

  const fmtDate = (v: string | null) => (v ? new Date(v).toLocaleDateString() : '—');

  function statusBadge(row: ReviewRow) {
    if (row.isRemoved) return <StatusBadge status="removed" />;
    if (row.isHidden) return <span className="text-xs text-muted-foreground">{t('hidden')}</span>;
    return <StatusBadge status="approved" />;
  }

  return (
    <AppShell title={t('reviewsNav')} description={t('reviewsDesc')}>
      <PageHeader title={t('reviewsNav')} description={t('reviewsPageDesc')} />

      {error ? (
        <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      ) : null}

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)} className="mb-4">
        <TabsList>
          {FILTERS.map((f) => (
            <TabsTrigger key={f} value={f}>{filterLabel(f)}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {rows === null && !error ? (
        <p className="text-muted-foreground">{t('loading')}</p>
      ) : rows && rows.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">{t('emptyReviews')}</Card>
      ) : rows ? (
        <DataTable>
          <THead>
            <TH>{t('reviewerLabel')}</TH>
            <TH>{t('ratingLabel')}</TH>
            <TH>{t('commentLabel')}</TH>
            <TH>{t('relatedListing')}</TH>
            <TH />
            <TH>{t('createdAt')}</TH>
            <TH className="text-right">{t('actions')}</TH>
          </THead>
          <TBody>
            {rows.map((row) => (
              <TR key={row.id}>
                <TD>
                  <div className="flex items-center gap-2">
                    <Avatar src={row.reviewer?.avatarUrl} name={row.reviewer?.nickname} size={28} />
                    <span className="font-medium">{row.reviewer?.nickname ?? '—'}</span>
                  </div>
                </TD>
                <TD className="whitespace-nowrap font-medium text-amber-500">★ {row.rating}/5</TD>
                <TD className="max-w-[280px] whitespace-normal text-muted-foreground">
                  <span className="line-clamp-2">{row.comment ?? '—'}</span>
                </TD>
                <TD className="max-w-[200px] truncate">
                  {row.listingId ? (
                    <Link to={`/products/${row.listingId}`} className="text-primary hover:underline">
                      {row.listingTitle ?? `#${row.listingId}`}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">{row.listingTitle ?? '—'}</span>
                  )}
                </TD>
                <TD>{statusBadge(row)}</TD>
                <TD className="text-xs text-muted-foreground">{fmtDate(row.createdAt)}</TD>
                <TD className="text-right">
                  <Button asChild size="sm" variant="ghost">
                    <Link to={`/reviews/${row.id}`}>{t('view')}</Link>
                  </Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </DataTable>
      ) : null}
    </AppShell>
  );
}
