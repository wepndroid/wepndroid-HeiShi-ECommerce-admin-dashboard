import { Link } from 'react-router-dom';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { FileSearch, Search as SearchIcon } from 'lucide-react';
import { adminApi, type ContentItem } from '@/api/client';
import { useI18n } from '@/i18n';
import { AppShell } from '@/components/admin/AppShell';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable, TBody, TD, TH, THead, TR } from '@/components/admin/DataTable';
import { TablePagination } from '@/components/admin/TablePagination';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { EmptyState } from '@/components/admin/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
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
  { value: 'bundle', labelKey: 'filterTypeBundle' as const },
];

// 发布审核 (review) is the approval queue — only review-relevant states.
// 商品管理 (products) is the full catalog — every status, browsable/searchable.
const REVIEW_STATUS_FILTERS = [
  { value: 'pendingReview', labelKey: 'filterPending' as const },
  { value: 'rejected', labelKey: 'filterRejected' as const },
  { value: 'removed', labelKey: 'filterRemoved' as const },
];
const CATALOG_STATUS_FILTERS = [
  { value: 'all', labelKey: 'filterAll' as const },
  { value: 'approved', labelKey: 'filterApproved' as const },
  { value: 'pendingReview', labelKey: 'filterPending' as const },
  { value: 'rejected', labelKey: 'filterRejected' as const },
  { value: 'removed', labelKey: 'filterRemoved' as const },
];

export default function ContentPage({ mode = 'review' }: { mode?: 'all' | 'review' }) {
  const { t } = useI18n();
  const isAll = mode === 'all';
  const [items, setItems] = useState<ContentItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  // Products defaults to the whole catalog ('' → all); review defaults to the pending queue.
  const [filter, setFilter] = useState(isAll ? '' : 'pendingReview');
  const [typeFilter, setTypeFilter] = useState('all');
  const [highRiskOnly, setHighRiskOnly] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const statusOptions = isAll ? CATALOG_STATUS_FILTERS : REVIEW_STATUS_FILTERS;

  const load = useCallback(() => {
    adminApi
      .content(
        filter === 'all' || filter === '' ? undefined : filter,
        typeFilter === 'all' ? undefined : typeFilter,
        page,
        !isAll && highRiskOnly ? 'high' : undefined,
        isAll ? search : undefined,
      )
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
        setPageSize(res.pageSize);
      })
      .catch((err) => setError(err instanceof Error ? err.message : t('error')));
  }, [filter, typeFilter, page, highRiskOnly, search, isAll, t]);

  useEffect(() => {
    load();
  }, [load]);

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  }
  function clearSearch() {
    setSearchInput('');
    setSearch('');
    setPage(1);
  }

  return (
    <AppShell
      title={isAll ? t('products') : t('contentReview')}
      description={isAll ? t('productsDesc') : t('contentDesc')}
    >
      <PageHeader
        title={isAll ? t('products') : t('contentReview')}
        description={isAll ? t('productsPageDesc') : t('contentPageDesc')}
      />

      {/* Product management gets a catalog title search; the review queue does not. */}
      {isAll ? (
        <form onSubmit={submitSearch} className="mb-3 flex gap-2">
          <div className="relative w-full sm:max-w-sm">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('productSearch')}
              className="pl-8"
            />
          </div>
          <Button type="submit" variant="outline">{t('searchAction')}</Button>
          {search ? (
            <Button type="button" variant="ghost" onClick={clearSearch}>{t('clearSearch')}</Button>
          ) : null}
        </form>
      ) : null}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Select value={filter === '' ? 'all' : filter} onValueChange={(v) => { setFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            {statusOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>{t(o.labelKey)}</SelectItem>
            ))}
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
        {/* High-risk manual review is a 发布审核 concern only. */}
        {!isAll ? (
          <Button
            type="button"
            variant={highRiskOnly ? 'destructive' : 'outline'}
            className="w-full sm:w-auto"
            onClick={() => { setHighRiskOnly((v) => !v); setPage(1); }}
          >
            {t('filterHighRisk')}
          </Button>
        ) : null}
      </div>

      {error ? (
        <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      ) : null}

      {items.length === 0 ? (
        <EmptyState icon={<FileSearch className="h-5 w-5" />} title={t('noItems')} description={isAll ? t('emptyUsersFilter') : t('emptyContentQueue')} />
      ) : (
        <DataTable footer={<TablePagination page={page} total={total} pageSize={pageSize} onPageChange={setPage} />}>
          <THead>
            <TH>ID</TH>
            <TH>{t('title')}</TH>
            <TH>{t('type')}</TH>
            <TH>{t('publisher')}</TH>
            <TH>{t('city')}</TH>
            <TH>{t('price')}</TH>
            {!isAll ? <TH>{t('riskLevel')}</TH> : null}
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
                <TD>
                  {item.publisher ? (
                    <span className="flex items-center gap-2"><Avatar src={item.publisher.avatarUrl} name={item.publisher.nickname} size={24} />{item.publisher.nickname}</span>
                  ) : '—'}
                </TD>
                <TD>{item.city} / {item.area}</TD>
                <TD>${item.price}</TD>
                {!isAll ? (
                  <TD>
                    {item.riskLevel === 'high' ? (
                      <div className="flex flex-col gap-1">
                        <span
                          className="inline-flex w-fit items-center rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive"
                          title={item.matchedKeywords?.length ? `${t('matchedKeywords')}: ${item.matchedKeywords.join(', ')}` : undefined}
                        >
                          {t('riskHigh')}
                        </span>
                        {item.matchedKeywords?.length ? (
                          <div className="flex max-w-[180px] flex-wrap gap-1">
                            {item.matchedKeywords.map((kw) => (
                              <span key={kw} className="inline-flex items-center rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">{kw}</span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TD>
                ) : null}
                <TD><StatusBadge status={item.reviewStatus} /></TD>
                <TD className="text-muted-foreground">{item.createdAt ? new Date(item.createdAt).toLocaleString() : '—'}</TD>
                <TD className="text-right">
                  <Button asChild size="sm" variant="ghost">
                    <Link to={`/products/${item.id}`}>{isAll ? t('manage') : t('review')}</Link>
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
