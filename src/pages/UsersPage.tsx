import { Link } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Users as UsersIcon } from 'lucide-react';
import { adminApi, type UserRow } from '@/api/client';
import { useI18n } from '@/i18n';
import { AppShell } from '@/components/admin/AppShell';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable, TBody, TD, TH, THead, TR } from '@/components/admin/DataTable';
import { TablePagination } from '@/components/admin/TablePagination';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { EmptyState } from '@/components/admin/EmptyState';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function UsersPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<UserRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const load = useCallback(() => {
    adminApi
      .users(page)
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
        setPageSize(res.pageSize);
      })
      .catch((err) => setError(err instanceof Error ? err.message : t('error')));
  }, [page, t]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((u) => {
      if (statusFilter !== 'all' && u.accountStatus !== statusFilter) return false;
      if (!needle) return true;
      return (
        u.nickname?.toLowerCase().includes(needle) ||
        u.phone?.toLowerCase().includes(needle) ||
        u.id?.toLowerCase().includes(needle)
      );
    });
  }, [items, q, statusFilter]);

  return (
    <AppShell title={t('users')} description={t('usersDesc')}>
      <PageHeader title={t('users')} description={`${filtered.length} ${t('usersCount')}`} />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder={t('searchUsersPlaceholder')}
            aria-label={t('searchUsers')}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filterAll')}</SelectItem>
            <SelectItem value="normal">{t('statusNormal')}</SelectItem>
            <SelectItem value="banned">{t('statusBanned')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <p role="alert" className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState icon={<UsersIcon className="h-5 w-5" />} title={t('noItems')} description={t('emptyUsersFilter')} />
      ) : (
        <DataTable
          footer={<TablePagination page={page} total={total} pageSize={pageSize} onPageChange={setPage} />}
        >
          <THead>
            <TH>ID</TH>
            <TH>{t('nickname')}</TH>
            <TH>{t('phone')}</TH>
            <TH>{t('city')}</TH>
            <TH>{t('identityVerified')}</TH>
            <TH>{t('accountStatus')}</TH>
            <TH>{t('createdAt')}</TH>
            <TH className="text-right">{t('actions')}</TH>
          </THead>
          <TBody>
            {filtered.map((u) => (
              <TR key={u.id}>
                <TD className="font-mono text-xs text-muted-foreground">{u.id.slice(0, 8)}…</TD>
                <TD className="font-medium">{u.nickname}</TD>
                <TD>{u.phone}</TD>
                <TD>{u.city ?? '—'}</TD>
                <TD>
                  {u.identityVerified ? <StatusBadge status="approved" /> : <StatusBadge status="pending" />}
                </TD>
                <TD><StatusBadge status={u.accountStatus} /></TD>
                <TD className="text-muted-foreground">{u.createdAt ? new Date(u.createdAt).toLocaleString() : '—'}</TD>
                <TD className="text-right">
                  <Button asChild size="sm" variant="ghost">
                    <Link to={`/users/${u.id}`}>{t('view')}</Link>
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
