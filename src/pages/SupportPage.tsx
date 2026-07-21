import { useCallback, useEffect, useMemo, useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import {
  fetchSupportConversations,
  openSupportConversation,
  createRoleAnnouncement,
  replyToSupportConversation,
  type SupportConversationRow,
} from '@/api/client';
import { useI18n } from '@/i18n';
import { AppShell } from '@/components/admin/AppShell';
import { PageHeader } from '@/components/admin/PageHeader';
import { EmptyState } from '@/components/admin/EmptyState';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export default function SupportPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<SupportConversationRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [sending, setSending] = useState(false);
  const [recipientId, setRecipientId] = useState('');
  const [recipientRole, setRecipientRole] = useState<'buyer' | 'seller'>('buyer');
  const [conversationType, setConversationType] = useState<
    'BUYER_SUPPORT' | 'SELLER_SUPPORT' | 'ORDER_SUPPORT' | 'DISPUTE_SUPPORT' | 'ACCOUNT_REVIEW' | 'SYSTEM_SERVICE'
  >('BUYER_SUPPORT');
  const [supportOrderId, setSupportOrderId] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newBody, setNewBody] = useState('');
  const [announcementRole, setAnnouncementRole] = useState<'buyer' | 'seller' | 'both'>('both');
  const [announcementUserIds, setAnnouncementUserIds] = useState('');
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementBody, setAnnouncementBody] = useState('');

  const load = useCallback(async () => {
    try {
      const rows = await fetchSupportConversations();
      setItems(rows);
      setSelectedId((current) => current ?? rows[0]?.id ?? null);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    }
  }, [t]);

  useEffect(() => { void load(); }, [load]);
  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  async function sendReply() {
    if (!selected || !reply.trim()) return;
    setSending(true);
    try {
      const updated = await replyToSupportConversation(selected.id, reply.trim());
      setItems((current) => current.map((item) => item.id === updated.id ? updated : item));
      setReply('');
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    } finally {
      setSending(false);
    }
  }

  async function openConversation() {
    if (!recipientId.trim() || !newSubject.trim() || !newBody.trim()) return;
    try {
      const created = await openSupportConversation({
        userId: recipientId.trim(),
        userRoleContext: recipientRole,
        conversationType,
        subject: newSubject.trim(),
        body: newBody.trim(),
        orderId: supportOrderId.trim() ? Number(supportOrderId) : undefined,
      });
      setItems((current) => [created, ...current]);
      setSelectedId(created.id);
      setRecipientId('');
      setSupportOrderId('');
      setNewSubject('');
      setNewBody('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    }
  }

  async function sendAnnouncement() {
    if (!announcementTitle.trim() || !announcementBody.trim()) return;
    try {
      const result = await createRoleAnnouncement({
        audienceRole: announcementRole,
        userIds: announcementUserIds
          .split(/[\s,]+/)
          .map((value) => value.trim())
          .filter(Boolean),
        title: announcementTitle.trim(),
        body: announcementBody.trim(),
      });
      setAnnouncementTitle('');
      setAnnouncementBody('');
      setAnnouncementUserIds('');
      setNotice(`${t('announcementSent')} ${result.recipientCount}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    }
  }

  return (
    <AppShell title={t('supportConversations')} description={t('supportConversationsDesc')}>
      <PageHeader title={t('supportConversations')} description={t('supportConversationsPageDesc')} />
      <div className="mb-5 grid gap-4 xl:grid-cols-2">
        <Card className="grid gap-3 p-4 md:grid-cols-2">
          <div><Label>{t('userId')}</Label><Input value={recipientId} onChange={(e) => setRecipientId(e.target.value)} /></div>
          <div>
            <Label>{t('recipientRole')}</Label>
            <Select value={recipientRole} onValueChange={(value) => setRecipientRole(value as 'buyer' | 'seller')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="buyer">{t('buyer')}</SelectItem><SelectItem value="seller">{t('seller')}</SelectItem></SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('conversationType')}</Label>
            <Select
              value={conversationType}
              onValueChange={(value) => {
                const next = value as typeof conversationType;
                setConversationType(next);
                if (next === 'BUYER_SUPPORT') setRecipientRole('buyer');
                if (next === 'SELLER_SUPPORT') setRecipientRole('seller');
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BUYER_SUPPORT">{t('buyerSupport')}</SelectItem>
                <SelectItem value="SELLER_SUPPORT">{t('sellerSupport')}</SelectItem>
                <SelectItem value="ORDER_SUPPORT">{t('orderSupport')}</SelectItem>
                <SelectItem value="DISPUTE_SUPPORT">{t('disputeSupport')}</SelectItem>
                <SelectItem value="ACCOUNT_REVIEW">{t('accountReview')}</SelectItem>
                <SelectItem value="SYSTEM_SERVICE">{t('systemService')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('orderId')} (optional)</Label>
            <Input
              inputMode="numeric"
              value={supportOrderId}
              onChange={(event) => setSupportOrderId(event.target.value.replace(/\D/g, ''))}
            />
          </div>
          <div className="md:col-span-2"><Label>{t('subject')}</Label><Input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} /></div>
          <div className="md:col-span-2"><Label>{t('message')}</Label><Textarea value={newBody} onChange={(e) => setNewBody(e.target.value)} rows={2} /></div>
          <Button className="md:col-span-2" onClick={openConversation}>{t('openSupportConversation')}</Button>
        </Card>
        <Card className="grid gap-3 p-4 md:grid-cols-2">
          <div>
            <Label>{t('audience')}</Label>
            <Select value={announcementRole} onValueChange={(value) => setAnnouncementRole(value as 'buyer' | 'seller' | 'both')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="buyer">{t('buyers')}</SelectItem>
                <SelectItem value="seller">{t('sellers')}</SelectItem>
                <SelectItem value="both">{t('buyersAndSellers')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>{t('title')}</Label><Input value={announcementTitle} onChange={(e) => setAnnouncementTitle(e.target.value)} /></div>
          <div className="md:col-span-2">
            <Label>{t('selectedUserIds')}</Label>
            <Input
              value={announcementUserIds}
              onChange={(e) => setAnnouncementUserIds(e.target.value)}
              placeholder={t('selectedUserIdsHint')}
            />
          </div>
          <div className="md:col-span-2"><Label>{t('message')}</Label><Textarea value={announcementBody} onChange={(e) => setAnnouncementBody(e.target.value)} rows={2} /></div>
          <Button className="md:col-span-2" onClick={sendAnnouncement}>{t('sendAnnouncement')}</Button>
        </Card>
      </div>
      {error ? <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
      {notice ? <p className="mb-4 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm">{notice}</p> : null}
      {items.length === 0 ? (
        <EmptyState icon={<MessageCircle className="h-5 w-5" />} title={t('noItems')} description={t('emptySupportConversations')} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <Card className="max-h-[70vh] overflow-y-auto p-2">
            {items.map((item) => {
              const last = item.messages[item.messages.length - 1];
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={cn(
                    'mb-1 w-full rounded-md p-3 text-left transition-colors',
                    selectedId === item.id ? 'bg-primary/10' : 'hover:bg-muted',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{item.subject}</span>
                    <Badge variant="outline">{item.userRoleContext}</Badge>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{last?.body}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {item.orderId ? `${t('orderId')} #${item.orderId}` : `${t('userId')} #${item.userId}`}
                  </p>
                </button>
              );
            })}
          </Card>

          {selected ? (
            <Card className="flex min-h-[520px] flex-col p-4">
              <div className="border-b pb-3">
                <h2 className="font-semibold">{selected.subject}</h2>
                <p className="text-xs text-muted-foreground">
                  {t('userId')} #{selected.userId}
                  {selected.orderId ? ` · ${t('orderId')} #${selected.orderId}` : ''}
                </p>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto py-4">
                {selected.messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'max-w-[82%] rounded-lg px-3 py-2 text-sm',
                      message.senderRole === 'admin'
                        ? 'ml-auto bg-primary text-primary-foreground'
                        : 'bg-muted',
                    )}
                  >
                    <div className="mb-1 flex items-center gap-2 text-[10px] opacity-70">
                      <span>{message.senderRole === 'admin' ? t('officialSupport') : message.senderRole}</span>
                      <span>{new Date(message.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="whitespace-pre-wrap">{message.body}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 border-t pt-3">
                <Textarea
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  placeholder={t('supportReplyPlaceholder')}
                  rows={3}
                />
                <Button onClick={sendReply} disabled={sending || !reply.trim()} aria-label={t('send')}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ) : null}
        </div>
      )}
    </AppShell>
  );
}
