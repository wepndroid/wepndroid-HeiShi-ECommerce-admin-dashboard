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

const CATEGORY_TYPES = ['product', 'service', 'job', 'rental'] as const;

export default function ConfigPage() {
  const { t } = useI18n();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [regions, setRegions] = useState<RegionRow[]>([]);
  const [banners, setBanners] = useState<BannerRow[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    Promise.all([adminApi.categories(), adminApi.regions(), adminApi.banners()])
      .then(([c, r, b]) => { setCategories(c.items); setRegions(r.items); setBanners(b.items); })
      .catch((err) => setError(err instanceof Error ? err.message : t('error')));
  }, [t]);
  useEffect(() => { load(); }, [load]);

  async function toggleCategory(row: CategoryRow) { await adminApi.patchCategory(row.id, { enabled: !row.enabled }); load(); }
  async function toggleRegion(row: RegionRow) { await adminApi.patchRegion(row.id, { enabled: !row.enabled }); load(); }
  async function toggleBanner(row: BannerRow) { await adminApi.patchBanner(row.id, { enabled: !row.enabled }); load(); }

  async function addCategory() {
    const key = window.prompt(t('key')); if (!key?.trim()) return;
    const typeRaw = window.prompt(t('pickCategoryType'), 'product') ?? 'product';
    if (!CATEGORY_TYPES.includes(typeRaw as (typeof CATEGORY_TYPES)[number])) return;
    await adminApi.createCategory({
      type: typeRaw as (typeof CATEGORY_TYPES)[number],
      key: key.trim(),
      labelEn: key.trim(),
      labelZh: key.trim(),
      sortOrder: categories.length,
      enabled: true,
    });
    load();
  }
  async function editCategory(row: CategoryRow) {
    const labelEn = window.prompt(t('labelEn'), row.labelEn); if (labelEn == null) return;
    const labelZh = window.prompt(t('labelZh'), row.labelZh); if (labelZh == null) return;
    const sortRaw = window.prompt(t('sortOrder'), String(row.sortOrder)); if (sortRaw == null) return;
    const sortOrder = Number(sortRaw); if (!Number.isFinite(sortOrder)) return;
    await adminApi.patchCategory(row.id, { labelEn: labelEn.trim(), labelZh: labelZh.trim(), sortOrder }); load();
  }
  async function addRegion() {
    const country = window.prompt(t('country'), 'AU'); if (!country?.trim()) return;
    const state = window.prompt(t('state')); if (!state?.trim()) return;
    const city = window.prompt(t('city')); if (!city?.trim()) return;
    const area = window.prompt(t('areaOptional')) ?? '';
    const labelEn = window.prompt(t('labelEn'), city.trim()) ?? city.trim();
    const labelZh = window.prompt(t('labelZh'), city.trim()) ?? city.trim();
    await adminApi.createRegion({ country: country.trim(), state: state.trim(), city: city.trim(), area: area.trim() || null, labelEn, labelZh, isDefaultCity: false, sortOrder: regions.length, enabled: true }); load();
  }
  async function editRegion(row: RegionRow) {
    const labelEn = window.prompt(t('labelEn'), row.labelEn); if (labelEn == null) return;
    const labelZh = window.prompt(t('labelZh'), row.labelZh); if (labelZh == null) return;
    const sortRaw = window.prompt(t('sortOrder'), String(row.sortOrder)); if (sortRaw == null) return;
    const sortOrder = Number(sortRaw); if (!Number.isFinite(sortOrder)) return;
    const defaultRaw = window.prompt(t('setDefaultCity'), row.isDefaultCity ? 'y' : 'n') ?? 'n';
    await adminApi.patchRegion(row.id, { labelEn: labelEn.trim(), labelZh: labelZh.trim(), sortOrder, isDefaultCity: defaultRaw.toLowerCase().startsWith('y') }); load();
  }
  async function addBanner() {
    const title = window.prompt(t('title'));
    const imageUrl = window.prompt(t('imageUrl'));
    const linkUrl = window.prompt(t('linkUrl')) ?? '';
    const position = window.prompt(`${t('position')} (home/category)`, 'home') ?? 'home';
    const onlineAt = window.prompt(t('onlineAt')) ?? '';
    const offlineAt = window.prompt(t('offlineAt')) ?? '';
    if (!title?.trim() || !imageUrl?.trim()) return;
    await adminApi.createBanner({
      title: title.trim(),
      imageUrl: imageUrl.trim(),
      linkUrl: linkUrl.trim() || null,
      position: position === 'category' ? 'category' : 'home',
      onlineAt: onlineAt.trim() || null,
      offlineAt: offlineAt.trim() || null,
      enabled: true,
    });
    load();
  }
  async function editBanner(row: BannerRow) {
    const title = window.prompt(t('title'), row.title); if (title == null) return;
    const imageUrl = window.prompt(t('imageUrl'), row.imageUrl); if (imageUrl == null) return;
    const linkUrl = window.prompt(t('linkUrl'), row.linkUrl ?? ''); if (linkUrl == null) return;
    const position = window.prompt(`${t('position')} (home/category)`, row.position); if (position == null) return;
    const onlineAt = window.prompt(t('onlineAt'), row.onlineAt ?? ''); if (onlineAt == null) return;
    const offlineAt = window.prompt(t('offlineAt'), row.offlineAt ?? ''); if (offlineAt == null) return;
    await adminApi.patchBanner(row.id, {
      title: title.trim(),
      imageUrl: imageUrl.trim(),
      linkUrl: linkUrl.trim() || null,
      position: position === 'category' ? 'category' : 'home',
      onlineAt: onlineAt.trim() || null,
      offlineAt: offlineAt.trim() || null,
    });
    load();
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
                  <TD><Switch checked={row.enabled} onCheckedChange={() => toggleCategory(row)} aria-label={`Toggle ${row.key}`} /></TD>
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
                  <TD><Switch checked={row.enabled} onCheckedChange={() => toggleRegion(row)} aria-label={`Toggle ${row.city}`} /></TD>
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
                  <TD><Switch checked={row.enabled} onCheckedChange={() => toggleBanner(row)} aria-label={`Toggle ${row.title}`} /></TD>
                  <TD className="text-right"><Button onClick={() => editBanner(row)} size="sm" variant="ghost">{t('edit')}</Button></TD>
                </TR>
              ))}
            </TBody>
          </DataTable>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
