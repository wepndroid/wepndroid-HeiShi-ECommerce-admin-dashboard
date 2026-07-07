import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search,
  Users as UsersIcon,
  MoreHorizontal,
  Eye,
  Ban,
  ShieldCheck,
  FileText,
  ShoppingBag,
  MicOff,
  Send,
  Flag,
} from 'lucide-react';
import { adminApi, type UserRow } from '@/api/client';
import { useI18n } from '@/i18n';
import { AppShell } from '@/components/admin/AppShell';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable, TBody, TD, TH, THead, TR } from '@/components/admin/DataTable';
import { TablePagination } from '@/components/admin/TablePagination';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { EmptyState } from '@/components/admin/EmptyState';
import { FormModal, type ModalConfig } from '@/components/admin/FormModal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { ImageLightbox } from '@/components/ui/image-lightbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function UsersPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [items, setItems] = useState<UserRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get('q') ?? '');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modal, setModal] = useState<ModalConfig | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  // Sync the search box when arriving from the global header search (?q=...).
  useEffect(() => {
    setQ(searchParams.get('q') ?? '');
    setPage(1);
  }, [searchParams]);

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

  function ban(u: UserRow) {
    setModal({
      title: `${t('ban')} · ${u.nickname}`,
      destructive: true,
      submitLabel: t('ban'),
      fields: [{ name: 'reason', label: t('banReason'), kind: 'textarea', required: true }],
      onSubmit: async (v) => {
        await adminApi.banUser(u.id, v.reason.trim());
        load();
      },
    });
  }

  function unban(u: UserRow) {
    setModal({
      title: `${t('unban')} · ${u.nickname}`,
      description: t('confirmUnban'),
      submitLabel: t('unban'),
      fields: [],
      onSubmit: async () => {
        await adminApi.unbanUser(u.id);
        load();
      },
    });
  }

  function mute(u: UserRow) {
    setModal({
      title: `${t('mute')} · ${u.nickname}`,
      submitLabel: t('mute'),
      fields: [{ name: 'reason', label: t('reasonOptional'), kind: 'textarea' }],
      onSubmit: async (v) => {
        await adminApi.muteUser(u.id, v.reason.trim() || undefined);
        load();
      },
    });
  }

  function restrict(u: UserRow) {
    setModal({
      title: `${t('restrictPublish')} · ${u.nickname}`,
      submitLabel: t('restrictPublish'),
      fields: [{ name: 'reason', label: t('reasonOptional'), kind: 'textarea' }],
      onSubmit: async (v) => {
        await adminApi.restrictPublish(u.id, v.reason.trim() || undefined);
        load();
      },
    });
  }

  function flag(u: UserRow) {
    setModal({
      title: `${t('flagAbnormal')} · ${u.nickname}`,
      destructive: true,
      submitLabel: t('flagAbnormal'),
      fields: [{ name: 'reason', label: t('reasonOptional'), kind: 'textarea' }],
      onSubmit: async (v) => {
        await adminApi.flagUser(u.id, v.reason.trim() || undefined);
        load();
      },
    });
  }

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
                <TD className="font-medium">
                  <div className="flex items-center gap-2">
                    {u.avatarUrl ? (
                      <button
                        type="button"
                        onClick={() => setPreviewSrc(u.avatarUrl)}
                        aria-label={t('viewImage')}
                        className="rounded-full transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Avatar src={u.avatarUrl} name={u.nickname} size={28} />
                      </button>
                    ) : (
                      <Avatar src={u.avatarUrl} name={u.nickname} size={28} />
                    )}
                    <span>{u.nickname}</span>
                  </div>
                </TD>
                <TD>{u.phone}</TD>
                <TD>{u.city ?? '—'}</TD>
                <TD>
                  {u.identityVerified ? <StatusBadge status="approved" /> : <StatusBadge status="pending" />}
                </TD>
                <TD><StatusBadge status={u.accountStatus} /></TD>
                <TD className="text-muted-foreground">{u.createdAt ? new Date(u.createdAt).toLocaleString() : '—'}</TD>
                <TD className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button asChild size="sm" variant="ghost">
                      <Link to={`/users/${u.id}`}>{t('view')}</Link>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={t('actions')}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onSelect={() => navigate(`/users/${u.id}`)}>
                          <Eye className="mr-2 h-4 w-4" />
                          {t('view')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => navigate(`/users/${u.id}#listings`)}>
                          <FileText className="mr-2 h-4 w-4" />
                          {t('viewListings')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => navigate(`/users/${u.id}#orders`)}>
                          <ShoppingBag className="mr-2 h-4 w-4" />
                          {t('viewOrders')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => mute(u)}>
                          <MicOff className="mr-2 h-4 w-4" />
                          {t('mute')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => restrict(u)}>
                          <Send className="mr-2 h-4 w-4" />
                          {t('restrictPublish')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => flag(u)}>
                          <Flag className="mr-2 h-4 w-4" />
                          {t('flagAbnormal')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {u.accountStatus === 'banned' ? (
                          <DropdownMenuItem onSelect={() => unban(u)}>
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            {t('unban')}
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onSelect={() => ban(u)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Ban className="mr-2 h-4 w-4" />
                            {t('ban')}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </DataTable>
      )}
      <FormModal config={modal} onClose={() => setModal(null)} />
      <ImageLightbox src={previewSrc} onClose={() => setPreviewSrc(null)} />
    </AppShell>
  );
}
