import { Link } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, Clock, Check, X } from 'lucide-react';
import { adminApi, type VerificationRow, type AuthStatusRow } from '@/api/client';
import { useI18n } from '@/i18n';
import { AppShell } from '@/components/admin/AppShell';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable, TBody, TD, TH, THead, TR } from '@/components/admin/DataTable';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { EmptyState } from '@/components/admin/EmptyState';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';

function VerifiedPill({ verified, t }: { verified: boolean; t: (k: 'verifiedLabel' | 'unverifiedLabel') => string }) {
  return verified ? (
    <Badge className="border-transparent bg-[#7ad80b] text-black hover:bg-[#7ad80b]/80">{t('verifiedLabel')}</Badge>
  ) : (
    <Badge variant="secondary" className="text-muted-foreground">{t('unverifiedLabel')}</Badge>
  );
}

export default function VerificationsPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<VerificationRow[]>([]);
  const [authRows, setAuthRows] = useState<AuthStatusRow[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    adminApi.verifications().then((res) => setItems(res.items))
      .catch((err) => setError(err instanceof Error ? err.message : t('error')));
    adminApi.authStatus().then((res) => setAuthRows(res.items))
      .catch((err) => setError(err instanceof Error ? err.message : t('error')));
  }, [t]);
  useEffect(() => { load(); }, [load]);

  const pending = items.filter((i) => i.status === 'pending').length;
  const approved = items.filter((i) => i.status === 'approved').length;
  const rejected = items.filter((i) => i.status === 'rejected').length;

  return (
    <AppShell title={t('verifications')} description={t('verificationsDesc')}>
      <PageHeader title={t('verifications')} description={t('verificationsPageDesc')} />

      {error ? <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}

      <Tabs defaultValue="realname">
        <TabsList>
          <TabsTrigger value="realname">{t('realNameQueue')}</TabsTrigger>
          <TabsTrigger value="authStatus">{t('authStatus')}</TabsTrigger>
        </TabsList>

        {/* Real-name verification queue */}
        <TabsContent value="realname" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: t('statPending'), value: pending, icon: Clock },
              { label: t('statApproved'), value: approved, icon: Check },
              { label: t('statRejected'), value: rejected, icon: X },
            ].map((c) => {
              const Icon = c.icon;
              return (
                <Card
                  key={c.label}
                  className="flex items-center justify-between border-[#7ad80b] p-4 transition-all hover:bg-[#7ad80b]/20 hover:backdrop-blur-sm hover:shadow-lg hover:shadow-[#7ad80b]/40"
                >
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">{c.label}</p>
                    <p className="mt-1 text-2xl font-semibold">{c.value}</p>
                  </div>
                  <span className="grid h-9 w-9 place-items-center rounded-md bg-muted text-muted-foreground">
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </span>
                </Card>
              );
            })}
          </div>

          {items.length === 0 ? (
            <EmptyState icon={<ShieldCheck className="h-5 w-5" />} title={t('noItems')} description={t('emptyVerifications')} />
          ) : (
            <DataTable>
              <THead>
                <TH>{t('nickname')}</TH>
                <TH>{t('phone')}</TH>
                <TH>{t('legalName')}</TH>
                <TH>{t('status')}</TH>
                <TH>{t('createdAt')}</TH>
                <TH className="text-right">{t('actions')}</TH>
              </THead>
              <TBody>
                {items.map((row) => (
                  <TR key={row.id}>
                    <TD className="font-medium">
                      <div className="flex items-center gap-2">
                        <Avatar src={row.avatarUrl} name={row.nickname} size={28} />
                        <span>{row.nickname ?? '—'}</span>
                      </div>
                    </TD>
                    <TD>{row.phone}</TD>
                    <TD>{row.legalName}</TD>
                    <TD><StatusBadge status={row.status} /></TD>
                    <TD className="text-muted-foreground">{row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}</TD>
                    <TD className="text-right">
                      <Button asChild size="sm" variant="ghost">
                        <Link to={`/verifications/${row.id}`}>{t('review')}</Link>
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </DataTable>
          )}
        </TabsContent>

        {/* Phone / email / real-name auth status */}
        <TabsContent value="authStatus" className="mt-4 space-y-4">
          <Card className="p-4">
            <p className="font-medium">{t('authStatus')}</p>
            <p className="text-xs text-muted-foreground">{t('authStatusDesc')}</p>
          </Card>

          {authRows === null ? (
            <EmptyState icon={<ShieldCheck className="h-5 w-5" />} title={t('loading')} />
          ) : authRows.length === 0 ? (
            <EmptyState icon={<ShieldCheck className="h-5 w-5" />} title={t('noItems')} />
          ) : (
            <DataTable>
              <THead>
                <TH>{t('nickname')}</TH>
                <TH>{t('phoneAuth')}</TH>
                <TH>{t('emailAuth')}</TH>
                <TH>{t('realName')}</TH>
              </THead>
              <TBody>
                {authRows.map((row) => (
                  <TR key={row.id}>
                    <TD className="font-medium">
                      <div className="flex items-center gap-2">
                        <Avatar src={row.avatarUrl} name={row.nickname} size={28} />
                        <span>{row.nickname ?? '—'}</span>
                      </div>
                    </TD>
                    <TD>
                      <div className="flex items-center gap-2">
                        <span>{row.phone ?? '—'}</span>
                        <VerifiedPill verified={row.phoneVerified} t={t} />
                      </div>
                    </TD>
                    <TD>
                      <div className="flex items-center gap-2">
                        <span>{row.email ?? '—'}</span>
                        <VerifiedPill verified={row.emailVerified} t={t} />
                      </div>
                    </TD>
                    <TD><VerifiedPill verified={row.identityVerified} t={t} /></TD>
                  </TR>
                ))}
              </TBody>
            </DataTable>
          )}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
