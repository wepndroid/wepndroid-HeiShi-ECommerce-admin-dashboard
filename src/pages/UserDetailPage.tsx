import { Link, useParams } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Ban, ShieldCheck } from 'lucide-react';
import { adminApi, type ContentItem, type OrderRow, type UserDetail } from '@/api/client';
import { useI18n } from '@/i18n';
import { AppShell } from '@/components/admin/AppShell';
import { PageHeader } from '@/components/admin/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/admin/StatusBadge';

export default function UserDetailPage() {
  const { t } = useI18n();
  const { userId } = useParams<{ userId: string }>();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [listings, setListings] = useState<ContentItem[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    Promise.all([adminApi.user(userId!), adminApi.userListings(userId!), adminApi.userOrders(userId!)])
      .then(([u, ls, os]) => {
        setUser(u);
        setNotes(u.adminNotes ?? '');
        setListings(ls.items);
        setOrders(os.items);
      })
      .catch((err) => setError(err instanceof Error ? err.message : t('error')));
  }, [userId, t]);

  useEffect(() => { load(); }, [load]);

  async function ban() {
    const reason = window.prompt(t('rejectReason'));
    if (!reason?.trim()) return;
    await adminApi.banUser(userId!, reason.trim());
    load();
  }
  async function unban() { await adminApi.unbanUser(userId!); load(); }
  async function saveNotes() { await adminApi.setUserNotes(userId!, notes); load(); }

  return (
    <AppShell title={user?.nickname ?? t('loading')} description={t('userDetailDesc')}>
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to="/users"><ArrowLeft className="h-4 w-4" />{t('back')}</Link>
      </Button>

      {error ? <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
      {!user ? <p className="text-muted-foreground">{t('loading')}</p> : (
        <>
          <PageHeader
            title={user.nickname}
            description={`${user.phone} · ${user.city ?? '—'}`}
            actions={
              user.accountStatus === 'banned' ? (
                <Button onClick={unban} variant="outline"><ShieldCheck className="h-4 w-4" />{t('unban')}</Button>
              ) : (
                <Button onClick={ban} variant="destructive"><Ban className="h-4 w-4" />{t('ban')}</Button>
              )
            }
          />

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { label: t('accountStatus'), value: <StatusBadge status={user.accountStatus} /> },
              { label: t('identityVerified'), value: <StatusBadge status={user.identityVerified ? 'approved' : 'pending'} /> },
              { label: t('listings'), value: <span className="text-2xl font-semibold">{user.listingCount}</span> },
              { label: t('orderHistory'), value: <span className="text-2xl font-semibold">{user.orderCount}</span> },
            ].map((s) => (
              <Card key={s.label} className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
                <div className="mt-2">{s.value}</div>
              </Card>
            ))}
          </div>

          <Card className="mt-6 p-5">
            <Label htmlFor="notes" className="text-sm font-semibold">{t('adminNotes')}</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-2" />
            <div className="mt-3 flex justify-end"><Button onClick={saveNotes} size="sm">{t('save')}</Button></div>
          </Card>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <h3 className="mb-3 text-sm font-semibold">{t('listings')}</h3>
              <ul className="divide-y divide-border">
                {listings.length === 0 ? <li className="py-2 text-sm text-muted-foreground">{t('noItems')}</li> : listings.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 py-2">
                    <Link to={`/content/${l.id}`} className="truncate text-sm hover:underline">{l.title}</Link>
                    <StatusBadge status={l.reviewStatus} />
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="p-5">
              <h3 className="mb-3 text-sm font-semibold">{t('orderHistory')}</h3>
              <ul className="divide-y divide-border">
                {orders.length === 0 ? <li className="py-2 text-sm text-muted-foreground">{t('noItems')}</li> : orders.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 py-2">
                    <Link to={`/orders/${o.id}`} className="truncate text-sm hover:underline">#{o.id} · {o.title}</Link>
                    <StatusBadge status={o.status} />
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </>
      )}
    </AppShell>
  );
}
