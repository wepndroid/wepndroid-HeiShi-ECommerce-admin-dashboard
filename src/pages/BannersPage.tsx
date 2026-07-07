import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { adminApi, type BannerRow, type TopicRow, type ProductTagRow } from '@/api/client';
import { useI18n } from '@/i18n';
import { AppShell } from '@/components/admin/AppShell';
import { PageHeader } from '@/components/admin/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable, TBody, TD, TH, THead, TR } from '@/components/admin/DataTable';
import { FormModal, type ModalConfig } from '@/components/admin/FormModal';

export default function BannersPage() {
  const { t } = useI18n();
  const [banners, setBanners] = useState<BannerRow[]>([]);
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [productTags, setProductTags] = useState<ProductTagRow[]>([]);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<ModalConfig | null>(null);
  const positionOptions = [
    { value: 'home', label: t('positionHome') },
    { value: 'category', label: t('positionCategory') },
  ];
  const tagOptions = [
    { value: '', label: t('tabAll') },
    ...productTags.map((tag) => ({ value: tag.key, label: tag.labelEn })),
  ];

  const load = useCallback(() => {
    Promise.all([adminApi.banners(), adminApi.topics(), adminApi.productTags()])
      .then(([b, tp, pt]) => {
        setBanners(b.items);
        setTopics(tp.items);
        setProductTags(pt.items);
      })
      .catch((err) => setError(err instanceof Error ? err.message : t('error')));
  }, [t]);
  useEffect(() => { load(); }, [load]);

  // --- Banners ---
  async function toggleBanner(row: BannerRow) { await adminApi.patchBanner(row.id, { enabled: !row.enabled }); load(); }

  function addBanner() {
    setModal({
      title: `${t('add')} · ${t('banners')}`,
      submitLabel: t('add'),
      fields: [
        { name: 'title', label: t('title'), required: true },
        { name: 'imageUrl', label: t('uploadImage'), kind: 'file', required: true },
        { name: 'linkUrl', label: t('linkUrl') },
        { name: 'position', label: t('position'), kind: 'select', options: positionOptions },
        { name: 'onlineAt', label: t('onlineAt') },
        { name: 'offlineAt', label: t('offlineAt') },
      ],
      onSubmit: async (v) => {
        await adminApi.createBanner({
          title: v.title.trim(),
          imageUrl: v.imageUrl.trim(),
          linkUrl: v.linkUrl.trim() || null,
          position: v.position === 'category' ? 'category' : 'home',
          onlineAt: v.onlineAt.trim() || null,
          offlineAt: v.offlineAt.trim() || null,
          enabled: true,
        });
        load();
      },
    });
  }
  function editBanner(row: BannerRow) {
    setModal({
      title: `${t('edit')} · ${row.title}`,
      submitLabel: t('save'),
      fields: [
        { name: 'title', label: t('title'), initialValue: row.title, required: true },
        { name: 'imageUrl', label: t('uploadImage'), kind: 'file', initialValue: row.imageUrl, required: true },
        { name: 'linkUrl', label: t('linkUrl'), initialValue: row.linkUrl ?? '' },
        { name: 'position', label: t('position'), kind: 'select', options: positionOptions, initialValue: row.position },
        { name: 'onlineAt', label: t('onlineAt'), initialValue: row.onlineAt ?? '' },
        { name: 'offlineAt', label: t('offlineAt'), initialValue: row.offlineAt ?? '' },
      ],
      onSubmit: async (v) => {
        await adminApi.patchBanner(row.id, {
          title: v.title.trim(),
          imageUrl: v.imageUrl.trim(),
          linkUrl: v.linkUrl.trim() || null,
          position: v.position === 'category' ? 'category' : 'home',
          onlineAt: v.onlineAt.trim() || null,
          offlineAt: v.offlineAt.trim() || null,
        });
        load();
      },
    });
  }

  // --- Topics ---
  async function toggleTopic(row: TopicRow) { await adminApi.patchTopic(row.id, { enabled: !row.enabled }); load(); }
  async function removeTopic(row: TopicRow) {
    if (!window.confirm(`${t('delete')} · ${row.title}?`)) return;
    await adminApi.deleteTopic(row.id);
    load();
  }
  function addTopic() {
    setModal({
      title: `${t('addTopic')}`,
      submitLabel: t('add'),
      fields: [
        { name: 'title', label: t('title'), required: true },
        { name: 'titleZh', label: t('labelZh') },
        { name: 'subtitle', label: t('subtitle') },
        { name: 'coverImageUrl', label: t('coverImage'), kind: 'file' },
        { name: 'tagKey', label: t('filterKey'), kind: 'select', options: tagOptions, initialValue: '' },
        { name: 'linkUrl', label: t('linkUrl') },
        { name: 'onlineAt', label: t('onlineAt') },
        { name: 'offlineAt', label: t('offlineAt') },
      ],
      onSubmit: async (v) => {
        await adminApi.createTopic({
          title: v.title.trim(),
          titleZh: v.titleZh.trim() || null,
          subtitle: v.subtitle.trim() || null,
          coverImageUrl: v.coverImageUrl.trim(),
          tagKey: v.tagKey.trim() || null,
          linkUrl: v.linkUrl.trim() || null,
          onlineAt: v.onlineAt.trim() || null,
          offlineAt: v.offlineAt.trim() || null,
          sortOrder: topics.length,
          enabled: true,
        });
        load();
      },
    });
  }
  function editTopic(row: TopicRow) {
    setModal({
      title: `${t('edit')} · ${row.title}`,
      submitLabel: t('save'),
      fields: [
        { name: 'title', label: t('title'), initialValue: row.title, required: true },
        { name: 'titleZh', label: t('labelZh'), initialValue: row.titleZh ?? '' },
        { name: 'subtitle', label: t('subtitle'), initialValue: row.subtitle ?? '' },
        { name: 'coverImageUrl', label: t('coverImage'), kind: 'file', initialValue: row.coverImageUrl },
        { name: 'tagKey', label: t('filterKey'), kind: 'select', options: tagOptions, initialValue: row.tagKey ?? '' },
        { name: 'linkUrl', label: t('linkUrl'), initialValue: row.linkUrl ?? '' },
        { name: 'onlineAt', label: t('onlineAt'), initialValue: row.onlineAt ?? '' },
        { name: 'offlineAt', label: t('offlineAt'), initialValue: row.offlineAt ?? '' },
        { name: 'sortOrder', label: t('sortOrder'), initialValue: String(row.sortOrder), required: true },
      ],
      onSubmit: async (v) => {
        const sortOrder = Number(v.sortOrder);
        if (!Number.isFinite(sortOrder)) return;
        await adminApi.patchTopic(row.id, {
          title: v.title.trim(),
          titleZh: v.titleZh.trim() || null,
          subtitle: v.subtitle.trim() || null,
          coverImageUrl: v.coverImageUrl.trim(),
          tagKey: v.tagKey.trim() || null,
          linkUrl: v.linkUrl.trim() || null,
          onlineAt: v.onlineAt.trim() || null,
          offlineAt: v.offlineAt.trim() || null,
          sortOrder,
        });
        load();
      },
    });
  }

  return (
    <AppShell title={t('bannersNav')} description={`${t('bannersDesc')} · ${t('topicsDesc')}`}>
      <PageHeader title={t('bannersNav')} description={`${t('bannersDesc')} · ${t('topicsDesc')}`} />
      {error ? <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}

      <Tabs defaultValue="banners">
        <TabsList>
          <TabsTrigger value="banners">{t('banners')}</TabsTrigger>
          <TabsTrigger value="topics">{t('topics')}</TabsTrigger>
        </TabsList>

        {/* Banners */}
        <TabsContent value="banners" className="mt-4 space-y-4">
          <Card className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{t('banners')}</p>
              <p className="text-xs text-muted-foreground">{t('bannersDesc')}</p>
            </div>
            <Button onClick={addBanner} size="sm"><Plus className="h-4 w-4" />{t('add')}</Button>
          </Card>
          <DataTable>
            <THead>
              <TH>{t('title')}</TH><TH>{t('position')}</TH><TH>{t('linkUrl')}</TH><TH>{t('onlineAt')}</TH><TH>{t('offlineAt')}</TH><TH>{t('status')}</TH><TH className="text-right">{t('actions')}</TH>
            </THead>
            <TBody>
              {banners.map((row) => (
                <TR key={row.id}>
                  <TD className="font-medium">{row.title}</TD>
                  <TD>{row.position === 'category' ? t('positionCategory') : t('positionHome')}</TD>
                  <TD className="max-w-[180px] truncate text-xs text-muted-foreground">{row.linkUrl ?? '—'}</TD>
                  <TD className="text-xs text-muted-foreground">{row.onlineAt ? new Date(row.onlineAt).toLocaleString() : '—'}</TD>
                  <TD className="text-xs text-muted-foreground">{row.offlineAt ? new Date(row.offlineAt).toLocaleString() : '—'}</TD>
                  <TD><Switch checked={row.enabled} onCheckedChange={() => toggleBanner(row)} aria-label={`${t('toggle')} ${row.title}`} /></TD>
                  <TD className="text-right"><Button onClick={() => editBanner(row)} size="sm" variant="ghost">{t('edit')}</Button></TD>
                </TR>
              ))}
            </TBody>
          </DataTable>
        </TabsContent>

        {/* Topics */}
        <TabsContent value="topics" className="mt-4 space-y-4">
          <Card className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{t('topics')}</p>
              <p className="text-xs text-muted-foreground">{t('topicsDesc')}</p>
            </div>
            <Button onClick={addTopic} size="sm"><Plus className="h-4 w-4" />{t('addTopic')}</Button>
          </Card>
          <DataTable>
            <THead>
              <TH>{t('title')}</TH><TH>{t('subtitle')}</TH><TH>{t('filterKey')}</TH><TH>{t('onlineAt')}</TH><TH>{t('offlineAt')}</TH><TH>{t('sortOrder')}</TH><TH>{t('status')}</TH><TH className="text-right">{t('actions')}</TH>
            </THead>
            <TBody>
              {topics.map((row) => (
                <TR key={row.id}>
                  <TD className="font-medium">
                    {row.title}
                    {row.titleZh ? <span className="ml-1 text-xs text-muted-foreground">{row.titleZh}</span> : null}
                  </TD>
                  <TD className="max-w-[180px] truncate text-xs text-muted-foreground">{row.subtitle ?? '—'}</TD>
                  <TD>{row.tagKey ?? '—'}</TD>
                  <TD className="text-xs text-muted-foreground">{row.onlineAt ? new Date(row.onlineAt).toLocaleString() : '—'}</TD>
                  <TD className="text-xs text-muted-foreground">{row.offlineAt ? new Date(row.offlineAt).toLocaleString() : '—'}</TD>
                  <TD>{row.sortOrder}</TD>
                  <TD><Switch checked={row.enabled} onCheckedChange={() => toggleTopic(row)} aria-label={`${t('toggle')} ${row.title}`} /></TD>
                  <TD className="text-right">
                    <Button onClick={() => editTopic(row)} size="sm" variant="ghost">{t('edit')}</Button>
                    <Button onClick={() => removeTopic(row)} size="sm" variant="ghost">{t('delete')}</Button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </DataTable>
        </TabsContent>
      </Tabs>
      <FormModal config={modal} onClose={() => setModal(null)} />
    </AppShell>
  );
}
