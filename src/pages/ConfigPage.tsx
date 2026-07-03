import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { adminApi, type BannerRow, type CategoryRow, type RegionRow } from '@/api/client';
import { useI18n } from '@/i18n';
import { AppShell } from '@/components/admin/AppShell';
import { PageHeader } from '@/components/admin/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable, TBody, TD, TH, THead, TR } from '@/components/admin/DataTable';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { FormModal, type ModalConfig } from '@/components/admin/FormModal';

const CATEGORY_TYPES = ['product', 'service', 'job', 'rental'] as const;

export default function ConfigPage() {
  const { t } = useI18n();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [regions, setRegions] = useState<RegionRow[]>([]);
  const [banners, setBanners] = useState<BannerRow[]>([]);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<ModalConfig | null>(null);
  const typeOptions = CATEGORY_TYPES.map((v) => ({ value: v, label: v }));
  const positionOptions = [
    { value: 'home', label: t('positionHome') },
    { value: 'category', label: t('positionCategory') },
  ];
  const boolOptions = [
    { value: 'n', label: t('no') },
    { value: 'y', label: t('yes') },
  ];

  const load = useCallback(() => {
    Promise.all([adminApi.categories(), adminApi.regions(), adminApi.banners()])
      .then(([c, r, b]) => { setCategories(c.items); setRegions(r.items); setBanners(b.items); })
      .catch((err) => setError(err instanceof Error ? err.message : t('error')));
  }, [t]);
  useEffect(() => { load(); }, [load]);

  async function toggleCategory(row: CategoryRow) { await adminApi.patchCategory(row.id, { enabled: !row.enabled }); load(); }
  async function toggleRegion(row: RegionRow) { await adminApi.patchRegion(row.id, { enabled: !row.enabled }); load(); }
  async function toggleBanner(row: BannerRow) { await adminApi.patchBanner(row.id, { enabled: !row.enabled }); load(); }

  function addCategory() {
    setModal({
      title: `${t('add')} · ${t('categories')}`,
      submitLabel: t('add'),
      fields: [
        { name: 'key', label: t('key'), required: true },
        { name: 'type', label: t('type'), kind: 'select', options: typeOptions },
        { name: 'labelEn', label: t('labelEn'), required: true },
        { name: 'labelZh', label: t('labelZh'), required: true },
      ],
      onSubmit: async (v) => {
        await adminApi.createCategory({
          type: v.type as (typeof CATEGORY_TYPES)[number],
          key: v.key.trim(),
          labelEn: v.labelEn.trim(),
          labelZh: v.labelZh.trim(),
          sortOrder: categories.length,
          enabled: true,
        });
        load();
      },
    });
  }
  function editCategory(row: CategoryRow) {
    setModal({
      title: `${t('edit')} · ${row.key}`,
      submitLabel: t('save'),
      fields: [
        { name: 'labelEn', label: t('labelEn'), initialValue: row.labelEn, required: true },
        { name: 'labelZh', label: t('labelZh'), initialValue: row.labelZh, required: true },
        { name: 'sortOrder', label: t('sortOrder'), initialValue: String(row.sortOrder), required: true },
      ],
      onSubmit: async (v) => {
        const sortOrder = Number(v.sortOrder);
        if (!Number.isFinite(sortOrder)) return;
        await adminApi.patchCategory(row.id, { labelEn: v.labelEn.trim(), labelZh: v.labelZh.trim(), sortOrder });
        load();
      },
    });
  }
  function addRegion() {
    setModal({
      title: `${t('add')} · ${t('regions')}`,
      submitLabel: t('add'),
      fields: [
        { name: 'country', label: t('country'), initialValue: 'AU', required: true },
        { name: 'state', label: t('state'), required: true },
        { name: 'city', label: t('city'), required: true },
        { name: 'area', label: t('areaOptional') },
        { name: 'labelEn', label: t('labelEn'), required: true },
        { name: 'labelZh', label: t('labelZh'), required: true },
      ],
      onSubmit: async (v) => {
        await adminApi.createRegion({
          country: v.country.trim(),
          state: v.state.trim(),
          city: v.city.trim(),
          area: v.area.trim() || null,
          labelEn: v.labelEn.trim() || v.city.trim(),
          labelZh: v.labelZh.trim() || v.city.trim(),
          isDefaultCity: false,
          sortOrder: regions.length,
          enabled: true,
        });
        load();
      },
    });
  }
  function editRegion(row: RegionRow) {
    setModal({
      title: `${t('edit')} · ${row.city}`,
      submitLabel: t('save'),
      fields: [
        { name: 'labelEn', label: t('labelEn'), initialValue: row.labelEn, required: true },
        { name: 'labelZh', label: t('labelZh'), initialValue: row.labelZh, required: true },
        { name: 'sortOrder', label: t('sortOrder'), initialValue: String(row.sortOrder), required: true },
        { name: 'isDefaultCity', label: t('setDefaultCity'), kind: 'select', options: boolOptions, initialValue: row.isDefaultCity ? 'y' : 'n' },
      ],
      onSubmit: async (v) => {
        const sortOrder = Number(v.sortOrder);
        if (!Number.isFinite(sortOrder)) return;
        await adminApi.patchRegion(row.id, { labelEn: v.labelEn.trim(), labelZh: v.labelZh.trim(), sortOrder, isDefaultCity: v.isDefaultCity === 'y' });
        load();
      },
    });
  }
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

  return (
    <AppShell title={t('config')} description={t('configDesc')}>
      <PageHeader title={t('config')} description={t('configPageDesc')} />
      {error ? <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}

      <Tabs defaultValue="categories">
        <TabsList>
          <TabsTrigger value="categories">{t('categories')}</TabsTrigger>
          <TabsTrigger value="regions">{t('regions')}</TabsTrigger>
          <TabsTrigger value="banners">{t('banners')}</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="mt-4 space-y-4">
          <Card className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{t('categories')}</p>
              <p className="text-xs text-muted-foreground">{t('categoriesDesc')}</p>
            </div>
            <Button onClick={addCategory} size="sm"><Plus className="h-4 w-4" />{t('add')}</Button>
          </Card>
          <DataTable>
            <THead>
              <TH>{t('key')}</TH><TH>{t('type')}</TH><TH>{t('labelEn')}</TH><TH>{t('labelZh')}</TH><TH>{t('sortOrder')}</TH><TH>{t('status')}</TH><TH className="text-right">{t('actions')}</TH>
            </THead>
            <TBody>
              {categories.map((row) => (
                <TR key={row.id}>
                  <TD className="font-mono text-xs">{row.key}</TD>
                  <TD className="capitalize">{row.type}</TD>
                  <TD>{row.labelEn}</TD>
                  <TD>{row.labelZh}</TD>
                  <TD>{row.sortOrder}</TD>
                  <TD><Switch checked={row.enabled} onCheckedChange={() => toggleCategory(row)} aria-label={`${t('toggle')} ${row.key}`} /></TD>
                  <TD className="text-right"><Button onClick={() => editCategory(row)} size="sm" variant="ghost">{t('edit')}</Button></TD>
                </TR>
              ))}
            </TBody>
          </DataTable>
        </TabsContent>

        <TabsContent value="regions" className="mt-4 space-y-4">
          <Card className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{t('regions')}</p>
              <p className="text-xs text-muted-foreground">{t('regionsDesc')}</p>
            </div>
            <Button onClick={addRegion} size="sm"><Plus className="h-4 w-4" />{t('add')}</Button>
          </Card>
          <DataTable>
            <THead>
              <TH>{t('country')}</TH><TH>{t('city')}</TH><TH>{t('area')}</TH><TH>{t('labelEn')}</TH><TH>{t('defaultCity')}</TH><TH>{t('sortOrder')}</TH><TH>{t('status')}</TH><TH className="text-right">{t('actions')}</TH>
            </THead>
            <TBody>
              {regions.map((row) => (
                <TR key={row.id}>
                  <TD>{row.country}</TD>
                  <TD>{row.state} / {row.city}</TD>
                  <TD>{row.area ?? '—'}</TD>
                  <TD>{row.labelEn}</TD>
                  <TD>{row.isDefaultCity ? <StatusBadge status="approved" /> : '—'}</TD>
                  <TD>{row.sortOrder}</TD>
                  <TD><Switch checked={row.enabled} onCheckedChange={() => toggleRegion(row)} aria-label={`${t('toggle')} ${row.city}`} /></TD>
                  <TD className="text-right"><Button onClick={() => editRegion(row)} size="sm" variant="ghost">{t('edit')}</Button></TD>
                </TR>
              ))}
            </TBody>
          </DataTable>
        </TabsContent>

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
      </Tabs>
      <FormModal config={modal} onClose={() => setModal(null)} />
    </AppShell>
  );
}
