import { Link } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { FileSearch } from 'lucide-react';
import { adminApi, type ContentItem } from '@/api/client';
import { useI18n } from '@/i18n';
import { AppShell } from '@/components/admin/AppShell';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable, TBody, TD, TH, THead, TR } from '@/components/admin/DataTable';
import { TablePagination } from '@/components/admin/TablePagination';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { EmptyState } from '@/components/admin/EmptyState';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const TYPE_FILTERS = [
  { value: 'all', labelKey: 'filterTypeAll' as const },
  { value: 'product', labelKey: 'filterTypeProduct' as const },
  { value: 'service', labelKey: 'filterTypeService' as const },
  { value: 'job', labelKey: 'filterTypeJob' as const },
  { value: 'rental', labelKey: 'filterTypeRental' as const },
];

export default function ContentPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [filter, setFilter] = useState('pendingReview');
  const [typeFilter, setTypeFilter] = useState('all');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    adminApi
      .content(filter === 'all' ? undefined : filter, typeFilter === 'all' ? undefined : typeFilter, page)
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
        setPageSize(res.pageSize);
      })
      .catch((err) => setError(err instanceof Error ? err.message : t('error')));
  }, [filter, typeFilter, page, t]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AppShell title={t('contentReview')} description={t('contentDesc')}>
      <PageHeader title={t('contentReview')} description={t('contentPageDesc')} />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Select value={filter} onValueChange={(v) => { setFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pendingReview">{t('filterPending')}</SelectItem>
            <SelectItem value="all">{t('filterAll')}</SelectItem>
            <SelectItem value="approved">{t('filterApproved')}</SelectItem>
            <SelectItem value="rejected">{t('filterRejected')}</SelectItem>
            <SelectItem value="removed">{t('filterRemoved')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            {TYPE_FILTERS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{t(o.labelKey)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      ) : null}

      {items.length === 0 ? (
        <EmptyState icon={<FileSearch className="h-5 w-5" />} title={t('noItems')} description={t('emptyContentQueue')} />
      ) : (
        <DataTable footer={<TablePagination page={page} total={total} pageSize={pageSize} onPageChange={setPage} />}>
          <THead>
            <TH>ID</TH>
            <TH>{t('title')}</TH>
            <TH>{t('type')}</TH>
            <TH>{t('publisher')}</TH>
            <TH>{t('city')}</TH>
            <TH>{t('price')}</TH>
            <TH>{t('status')}</TH>
            <TH>{t('createdAt')}</TH>
            <TH className="text-right">{t('actions')}</TH>
          </THead>
          <TBody>
            {items.map((item) => (
              <TR key={item.id}>
                <TD className="font-mono text-xs text-muted-foreground">#{item.id}</TD>
                <TD className="max-w-[280px] truncate font-medium">{item.title}</TD>
                <TD className="capitalize">{item.type}</TD>
                <TD>{item.publisher ?? '—'}</TD>
                <TD>{item.city} / {item.area}</TD>
                <TD>${item.price}</TD>
                <TD><StatusBadge status={item.reviewStatus} /></TD>
                <TD className="text-muted-foreground">{item.createdAt ? new Date(item.createdAt).toLocaleString() : '—'}</TD>
                <TD className="text-right">
                  <Button asChild size="sm" variant="ghost">
                    <Link to={`/content/${item.id}`}>{t('review')}</Link>
                  </Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </DataTable>
      )}
    </AppShell>
  );
}
