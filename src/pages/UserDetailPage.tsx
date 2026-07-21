import { Link, useLocation, useParams } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Ban, ShieldCheck, MicOff, Mic, Send, SendHorizontal, Flag, FlagOff } from 'lucide-react';
import { adminApi, type ContentItem, type OrderRow, type UserDetail } from '@/api/client';
import { useI18n } from '@/i18n';
import { AppShell } from '@/components/admin/AppShell';
import { PageHeader } from '@/components/admin/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar } from '@/components/ui/avatar';
import { ImageLightbox } from '@/components/ui/image-lightbox';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { FormModal, type ModalConfig } from '@/components/admin/FormModal';

export default function UserDetailPage() {
  const { t } = useI18n();
  const { userId } = useParams<{ userId: string }>();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [listings, setListings] = useState<ContentItem[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [modal, setModal] = useState<ModalConfig | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const location = useLocation();

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

  // Deep-link to the listings / orders sections from the Users list actions menu.
  useEffect(() => {
    if (!user) return;
    const hash = location.hash.replace('#', '');
    if (!hash) return;
    document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [user, location.hash]);

  function ban() {
    setModal({
      title: t('ban'),
      destructive: true,
      submitLabel: t('ban'),
      fields: [{ name: 'reason', label: t('banReason'), kind: 'textarea', required: true }],
      onSubmit: async (v) => { await adminApi.banUser(userId!, v.reason.trim()); load(); },
    });
  }
  async function unban() { await adminApi.unbanUser(userId!); load(); }
  async function saveNotes() { await adminApi.setUserNotes(userId!, notes); load(); }
  function mergeAccount() {
    setModal({
      title: t('mergeAccount'),
      destructive: true,
      submitLabel: t('mergeAccount'),
      fields: [{ name: 'destinationUserId', label: t('destinationUserId'), required: true }],
      onSubmit: async (v) => {
        await adminApi.mergeAccounts(userId!, v.destinationUserId.trim());
        load();
      },
    });
  }

  // Moderation: enabling mute/restrict/flag prompts for an optional reason via the shared modal.
  function mute() {
    setModal({
      title: t('mute'),
      submitLabel: t('mute'),
      fields: [{ name: 'reason', label: t('reasonOptional'), kind: 'textarea' }],
      onSubmit: async (v) => { await adminApi.muteUser(userId!, v.reason.trim() || undefined); load(); },
    });
  }
  async function unmute() { await adminApi.unmuteUser(userId!); load(); }

  function restrict() {
    setModal({
      title: t('restrictPublish'),
      submitLabel: t('restrictPublish'),
      fields: [{ name: 'reason', label: t('reasonOptional'), kind: 'textarea' }],
      onSubmit: async (v) => { await adminApi.restrictPublish(userId!, v.reason.trim() || undefined); load(); },
    });
  }
  async function unrestrict() { await adminApi.unrestrictPublish(userId!); load(); }

  function flag() {
    setModal({
      title: t('flagAbnormal'),
      destructive: true,
      submitLabel: t('flagAbnormal'),
      fields: [{ name: 'reason', label: t('reasonOptional'), kind: 'textarea' }],
      onSubmit: async (v) => { await adminApi.flagUser(userId!, v.reason.trim() || undefined); load(); },
    });
  }
  async function unflag() { await adminApi.unflagUser(userId!); load(); }

  return (
    <AppShell title={user?.nickname ?? t('loading')} description={t('userDetailDesc')}>
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to="/users"><ArrowLeft className="h-4 w-4" />{t('back')}</Link>
      </Button>

      {error ? <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
      {!user ? <p className="text-muted-foreground">{t('loading')}</p> : (
        <>
          <PageHeader
            leading={
              user.avatarUrl ? (
                <button
                  type="button"
                  onClick={() => setPreviewSrc(user.avatarUrl)}
                  aria-label={t('viewImage')}
                  className="rounded-full transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Avatar src={user.avatarUrl} name={user.nickname} size={48} />
                </button>
              ) : (
                <Avatar src={user.avatarUrl} name={user.nickname} size={48} />
              )
            }
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

          {user.isMuted || user.publishRestricted || user.isFlagged ? (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {user.isMuted ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-warning/15 px-1.5 py-0.5 text-[11px] font-medium text-warning-foreground ring-1 ring-inset ring-warning/30 whitespace-nowrap dark:text-warning">
                  <MicOff className="h-3 w-3" />{t('muted')}
                </span>
              ) : null}
              {user.publishRestricted ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-warning/15 px-1.5 py-0.5 text-[11px] font-medium text-warning-foreground ring-1 ring-inset ring-warning/30 whitespace-nowrap dark:text-warning">
                  <Send className="h-3 w-3" />{t('publishRestricted')}
                </span>
              ) : null}
              {user.isFlagged ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-1.5 py-0.5 text-[11px] font-medium text-destructive ring-1 ring-inset ring-destructive/25 whitespace-nowrap">
                  <Flag className="h-3 w-3" />{t('flagged')}
                </span>
              ) : null}
            </div>
          ) : null}

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
            <h3 className="mb-4 text-sm font-semibold">{t('moderationControls')}</h3>
            <div className="divide-y divide-border">
              <div className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{t('mute')}</span>
                    {user.isMuted ? (
                      <span className="inline-flex items-center rounded-md bg-warning/15 px-1.5 py-0.5 text-[11px] font-medium text-warning-foreground ring-1 ring-inset ring-warning/30 dark:text-warning">{t('muted')}</span>
                    ) : null}
                  </div>
                  {user.isMuted && user.muteReason ? (
                    <p className="mt-1 truncate text-xs text-muted-foreground">{t('reason')}: {user.muteReason}</p>
                  ) : null}
                </div>
                {user.isMuted ? (
                  <Button onClick={unmute} variant="outline" size="sm"><Mic className="h-4 w-4" />{t('unmute')}</Button>
                ) : (
                  <Button onClick={mute} variant="outline" size="sm"><MicOff className="h-4 w-4" />{t('mute')}</Button>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{t('restrictPublish')}</span>
                    {user.publishRestricted ? (
                      <span className="inline-flex items-center rounded-md bg-warning/15 px-1.5 py-0.5 text-[11px] font-medium text-warning-foreground ring-1 ring-inset ring-warning/30 dark:text-warning">{t('publishRestricted')}</span>
                    ) : null}
                  </div>
                  {user.publishRestricted && user.publishRestrictReason ? (
                    <p className="mt-1 truncate text-xs text-muted-foreground">{t('reason')}: {user.publishRestrictReason}</p>
                  ) : null}
                </div>
                {user.publishRestricted ? (
                  <Button onClick={unrestrict} variant="outline" size="sm"><SendHorizontal className="h-4 w-4" />{t('unrestrictPublish')}</Button>
                ) : (
                  <Button onClick={restrict} variant="outline" size="sm"><Send className="h-4 w-4" />{t('restrictPublish')}</Button>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{t('flagAbnormal')}</span>
                    {user.isFlagged ? (
                      <span className="inline-flex items-center rounded-md bg-destructive/10 px-1.5 py-0.5 text-[11px] font-medium text-destructive ring-1 ring-inset ring-destructive/25">{t('flagged')}</span>
                    ) : null}
                  </div>
                  {user.isFlagged && user.flagReason ? (
                    <p className="mt-1 truncate text-xs text-muted-foreground">{t('reason')}: {user.flagReason}</p>
                  ) : null}
                </div>
                {user.isFlagged ? (
                  <Button onClick={unflag} variant="outline" size="sm"><FlagOff className="h-4 w-4" />{t('unflag')}</Button>
                ) : (
                  <Button onClick={flag} variant="destructive" size="sm"><Flag className="h-4 w-4" />{t('flagAbnormal')}</Button>
                )}
              </div>
            </div>
          </Card>

          <Card className="mt-6 p-5">
            <Label htmlFor="notes" className="text-sm font-semibold">{t('adminNotes')}</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-2" />
            <div className="mt-3 flex justify-end"><Button onClick={saveNotes} size="sm">{t('save')}</Button></div>
          </Card>

          <Card className="mt-6 p-5">
            <h3 className="text-sm font-semibold">{t('mergeAccount')}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t('mergeAccountDesc')}</p>
            <div className="mt-3 flex justify-end">
              <Button onClick={mergeAccount} variant="destructive" size="sm" disabled={user.accountStatus === 'merged'}>
                {t('mergeAccount')}
              </Button>
            </div>
          </Card>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card id="listings" className="scroll-mt-20 p-5">
              <h3 className="mb-3 text-sm font-semibold">{t('listings')}</h3>
              <ul className="divide-y divide-border">
                {listings.length === 0 ? <li className="py-2 text-sm text-muted-foreground">{t('noItems')}</li> : listings.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 py-2">
                    <Link to={`/products/${l.id}`} className="truncate text-sm hover:underline">{l.title}</Link>
                    <StatusBadge status={l.reviewStatus} />
                  </li>
                ))}
              </ul>
            </Card>
            <Card id="orders" className="scroll-mt-20 p-5">
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
      <FormModal config={modal} onClose={() => setModal(null)} />
      <ImageLightbox src={previewSrc} onClose={() => setPreviewSrc(null)} />
    </AppShell>
  );
}
