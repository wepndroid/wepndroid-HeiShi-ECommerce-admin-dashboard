import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import {
  adminApi,
  type RegionRow,
  type KeywordRow,
  type ReportReasonRow,
  type ProductTagRow,
  type PlatformSettings,
} from '@/api/client';
import { useI18n } from '@/i18n';
import { AppShell } from '@/components/admin/AppShell';
import { PageHeader } from '@/components/admin/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable, TBody, TD, TH, THead, TR } from '@/components/admin/DataTable';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { FormModal, type ModalConfig } from '@/components/admin/FormModal';

const HOME_MODULE_KEYS = [
  'home.module.banners',
  'home.module.categories',
  'home.module.recommended',
  'home.module.graduationZone',
] as const;

export default function SystemConfigPage() {
  const { t } = useI18n();
  const [regions, setRegions] = useState<RegionRow[]>([]);
  const [keywords, setKeywords] = useState<KeywordRow[]>([]);
  const [reportReasons, setReportReasons] = useState<ReportReasonRow[]>([]);
  const [productTags, setProductTags] = useState<ProductTagRow[]>([]);
  const [values, setValues] = useState<PlatformSettings>({});
  const [userAgreement, setUserAgreement] = useState('');
  const [privacyPolicy, setPrivacyPolicy] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<ModalConfig | null>(null);

  const boolOptions = [
    { value: 'n', label: t('no') },
    { value: 'y', label: t('yes') },
  ];
  const localeOptions = [
    { value: 'all', label: t('locale') + ' · all' },
    { value: 'en', label: 'en' },
    { value: 'zh', label: 'zh' },
  ];

  const load = useCallback(() => {
    Promise.all([
      adminApi.regions(),
      adminApi.keywords(),
      adminApi.reportReasons(),
      adminApi.productTags(),
      adminApi.settings(),
    ])
      .then(([r, k, rr, pt, s]) => {
        setRegions(r.items);
        setKeywords(k.items);
        setReportReasons(rr.items);
        setProductTags(pt.items);
        setValues(s.values);
        setUserAgreement(s.values['legal.userAgreement'] ?? '');
        setPrivacyPolicy(s.values['legal.privacyPolicy'] ?? '');
      })
      .catch((err) => setError(err instanceof Error ? err.message : t('error')));
  }, [t]);
  useEffect(() => { load(); }, [load]);

  // --- Regions ---
  async function toggleRegion(row: RegionRow) { await adminApi.patchRegion(row.id, { enabled: !row.enabled }); load(); }
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

  // --- Keywords ---
  async function toggleKeyword(row: KeywordRow) { await adminApi.patchKeyword(row.id, { active: !row.active }); load(); }
  async function removeKeyword(row: KeywordRow) { await adminApi.deleteKeyword(row.id); load(); }
  function addKeyword() {
    setModal({
      title: `${t('add')} · ${t('keyword')}`,
      submitLabel: t('add'),
      fields: [
        { name: 'pattern', label: t('keyword'), required: true },
        { name: 'locale', label: t('locale'), kind: 'select', options: localeOptions, initialValue: 'all' },
      ],
      onSubmit: async (v) => {
        await adminApi.createKeyword({ pattern: v.pattern.trim(), locale: v.locale, active: true });
        load();
      },
    });
  }

  // --- Report reasons ---
  async function toggleReportReason(row: ReportReasonRow) { await adminApi.patchReportReason(row.id, { active: !row.active }); load(); }
  async function removeReportReason(row: ReportReasonRow) { await adminApi.deleteReportReason(row.id); load(); }
  function addReportReason() {
    setModal({
      title: `${t('add')} · ${t('reportReasons')}`,
      submitLabel: t('add'),
      fields: [
        { name: 'key', label: t('key'), required: true },
        { name: 'labelEn', label: t('labelEn'), required: true },
        { name: 'labelZh', label: t('labelZh'), required: true },
      ],
      onSubmit: async (v) => {
        await adminApi.createReportReason({
          key: v.key.trim(),
          labelEn: v.labelEn.trim(),
          labelZh: v.labelZh.trim(),
          sortOrder: reportReasons.length,
          active: true,
        });
        load();
      },
    });
  }
  function editReportReason(row: ReportReasonRow) {
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
        await adminApi.patchReportReason(row.id, { labelEn: v.labelEn.trim(), labelZh: v.labelZh.trim(), sortOrder });
        load();
      },
    });
  }

  // --- Product tags ---
  async function toggleProductTag(row: ProductTagRow) { await adminApi.patchProductTag(row.id, { active: !row.active }); load(); }
  async function removeProductTag(row: ProductTagRow) { await adminApi.deleteProductTag(row.id); load(); }
  function addProductTag() {
    setModal({
      title: `${t('add')} · ${t('productTags')}`,
      submitLabel: t('add'),
      fields: [
        { name: 'key', label: t('key'), required: true },
        { name: 'labelEn', label: t('labelEn'), required: true },
        { name: 'labelZh', label: t('labelZh'), required: true },
      ],
      onSubmit: async (v) => {
        await adminApi.createProductTag({
          key: v.key.trim(),
          labelEn: v.labelEn.trim(),
          labelZh: v.labelZh.trim(),
          sortOrder: productTags.length,
          active: true,
        });
        load();
      },
    });
  }
  function editProductTag(row: ProductTagRow) {
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
        await adminApi.patchProductTag(row.id, { labelEn: v.labelEn.trim(), labelZh: v.labelZh.trim(), sortOrder });
        load();
      },
    });
  }

  // --- Home & legal ---
  async function toggleHomeModule(key: string, next: boolean) {
    setValues((v) => ({ ...v, [key]: next ? 'on' : 'off' }));
    await adminApi.patchSettings({ [key]: next ? 'on' : 'off' });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  }
  async function saveLegal() {
    await adminApi.patchSettings({
      'legal.userAgreement': userAgreement,
      'legal.privacyPolicy': privacyPolicy,
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  }

  const homeModuleLabels: Record<string, string> = {
    'home.module.banners': t('banners'),
    'home.module.categories': t('categories'),
    'home.module.recommended': t('positionHome'),
    'home.module.graduationZone': t('positionCategory'),
  };

  return (
    <AppShell title={t('systemConfig')} description={t('systemConfigDesc')}>
      <PageHeader title={t('systemConfig')} description={t('systemConfigPageDesc')} />
      {error ? <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}

      <Tabs defaultValue="cities">
        <TabsList>
          <TabsTrigger value="cities">{t('regions')}</TabsTrigger>
          <TabsTrigger value="keywords">{t('keywords')}</TabsTrigger>
          <TabsTrigger value="reportReasons">{t('reportReasons')}</TabsTrigger>
          <TabsTrigger value="productTags">{t('productTags')}</TabsTrigger>
          <TabsTrigger value="homeLegal">{t('homeModules')}</TabsTrigger>
        </TabsList>

        {/* Cities / regions */}
        <TabsContent value="cities" className="mt-4 space-y-4">
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

        {/* Keywords */}
        <TabsContent value="keywords" className="mt-4 space-y-4">
          <Card className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{t('keywords')}</p>
              <p className="text-xs text-muted-foreground">{t('keywordsDesc')}</p>
            </div>
            <Button onClick={addKeyword} size="sm"><Plus className="h-4 w-4" />{t('addKeyword')}</Button>
          </Card>
          <DataTable>
            <THead>
              <TH>{t('keyword')}</TH><TH>{t('locale')}</TH><TH>{t('active')}</TH><TH className="text-right">{t('actions')}</TH>
            </THead>
            <TBody>
              {keywords.map((row) => (
                <TR key={row.id}>
                  <TD className="font-mono text-xs">{row.pattern}</TD>
                  <TD>{row.locale}</TD>
                  <TD><Switch checked={row.active} onCheckedChange={() => toggleKeyword(row)} aria-label={`${t('toggle')} ${row.pattern}`} /></TD>
                  <TD className="text-right"><Button onClick={() => removeKeyword(row)} size="sm" variant="ghost">{t('delete')}</Button></TD>
                </TR>
              ))}
            </TBody>
          </DataTable>
        </TabsContent>

        {/* Report reasons */}
        <TabsContent value="reportReasons" className="mt-4 space-y-4">
          <Card className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{t('reportReasons')}</p>
              <p className="text-xs text-muted-foreground">{t('reportReasonsDesc')}</p>
            </div>
            <Button onClick={addReportReason} size="sm"><Plus className="h-4 w-4" />{t('add')}</Button>
          </Card>
          <DataTable>
            <THead>
              <TH>{t('key')}</TH><TH>{t('labelEn')}</TH><TH>{t('labelZh')}</TH><TH>{t('sortOrder')}</TH><TH>{t('active')}</TH><TH className="text-right">{t('actions')}</TH>
            </THead>
            <TBody>
              {reportReasons.map((row) => (
                <TR key={row.id}>
                  <TD className="font-mono text-xs">{row.key}</TD>
                  <TD>{row.labelEn}</TD>
                  <TD>{row.labelZh}</TD>
                  <TD>{row.sortOrder}</TD>
                  <TD><Switch checked={row.active} onCheckedChange={() => toggleReportReason(row)} aria-label={`${t('toggle')} ${row.key}`} /></TD>
                  <TD className="text-right">
                    <Button onClick={() => editReportReason(row)} size="sm" variant="ghost">{t('edit')}</Button>
                    <Button onClick={() => removeReportReason(row)} size="sm" variant="ghost">{t('delete')}</Button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </DataTable>
        </TabsContent>

        {/* Product tags */}
        <TabsContent value="productTags" className="mt-4 space-y-4">
          <Card className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{t('productTags')}</p>
              <p className="text-xs text-muted-foreground">{t('productTagsDesc')}</p>
            </div>
            <Button onClick={addProductTag} size="sm"><Plus className="h-4 w-4" />{t('add')}</Button>
          </Card>
          <DataTable>
            <THead>
              <TH>{t('key')}</TH><TH>{t('labelEn')}</TH><TH>{t('labelZh')}</TH><TH>{t('sortOrder')}</TH><TH>{t('active')}</TH><TH className="text-right">{t('actions')}</TH>
            </THead>
            <TBody>
              {productTags.map((row) => (
                <TR key={row.id}>
                  <TD className="font-mono text-xs">{row.key}</TD>
                  <TD>{row.labelEn}</TD>
                  <TD>{row.labelZh}</TD>
                  <TD>{row.sortOrder}</TD>
                  <TD><Switch checked={row.active} onCheckedChange={() => toggleProductTag(row)} aria-label={`${t('toggle')} ${row.key}`} /></TD>
                  <TD className="text-right">
                    <Button onClick={() => editProductTag(row)} size="sm" variant="ghost">{t('edit')}</Button>
                    <Button onClick={() => removeProductTag(row)} size="sm" variant="ghost">{t('delete')}</Button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </DataTable>
        </TabsContent>

        {/* Home & legal */}
        <TabsContent value="homeLegal" className="mt-4 space-y-4">
          <Card className="space-y-4 p-4">
            <div>
              <p className="font-medium">{t('homeModules')}</p>
              <p className="text-xs text-muted-foreground">{t('homeModulesDesc')}</p>
            </div>
            <div className="space-y-3">
              {HOME_MODULE_KEYS.map((key) => (
                <div key={key} className="flex items-center justify-between gap-3">
                  <Label htmlFor={`hm-${key}`}>{homeModuleLabels[key] ?? key}</Label>
                  <Switch
                    id={`hm-${key}`}
                    checked={values[key] === 'on'}
                    onCheckedChange={(next) => toggleHomeModule(key, next)}
                    aria-label={`${t('toggle')} ${key}`}
                  />
                </div>
              ))}
            </div>
          </Card>

          <Card className="space-y-4 p-4">
            <div>
              <p className="font-medium">{t('legalDocs')}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="legal-user-agreement">{t('userAgreementLabel')}</Label>
              <Textarea
                id="legal-user-agreement"
                value={userAgreement}
                onChange={(e) => setUserAgreement(e.target.value)}
                rows={5}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="legal-privacy-policy">{t('privacyPolicyLabel')}</Label>
              <Textarea
                id="legal-privacy-policy"
                value={privacyPolicy}
                onChange={(e) => setPrivacyPolicy(e.target.value)}
                rows={5}
              />
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={saveLegal} size="sm">{t('saveChanges')}</Button>
              {saved ? <span className="text-xs text-muted-foreground">{t('settingsSaved')}</span> : null}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
      <FormModal config={modal} onClose={() => setModal(null)} />
    </AppShell>
  );
}
