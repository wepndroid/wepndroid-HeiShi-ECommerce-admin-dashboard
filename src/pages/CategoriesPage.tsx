import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { adminApi, type CategoryRow } from '@/api/client';
import { useI18n } from '@/i18n';
import { AppShell } from '@/components/admin/AppShell';
import { PageHeader } from '@/components/admin/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { DataTable, TBody, TD, TH, THead, TR } from '@/components/admin/DataTable';
import { FormModal, type ModalConfig } from '@/components/admin/FormModal';

const CATEGORY_TYPES = ['product', 'service', 'job', 'rental'] as const;

export default function CategoriesPage() {
  const { t } = useI18n();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<ModalConfig | null>(null);
  const typeOptions = CATEGORY_TYPES.map((v) => ({ value: v, label: v }));
  const boolOptions = [
    { value: 'n', label: t('no') },
    { value: 'y', label: t('yes') },
  ];

  const load = useCallback(() => {
    adminApi.categories()
      .then((c) => setCategories(c.items))
      .catch((err) => setError(err instanceof Error ? err.message : t('error')));
  }, [t]);
  useEffect(() => { load(); }, [load]);

  async function toggleCategory(row: CategoryRow) { await adminApi.patchCategory(row.id, { enabled: !row.enabled }); load(); }
  async function toggleShowOnHome(row: CategoryRow) { await adminApi.patchCategory(row.id, { showOnHome: !row.showOnHome }); load(); }

  function addCategory() {
    setModal({
      title: `${t('add')} · ${t('categories')}`,
      submitLabel: t('add'),
      fields: [
        { name: 'key', label: t('key'), required: true },
        { name: 'type', label: t('type'), kind: 'select', options: typeOptions },
        { name: 'labelEn', label: t('labelEn'), required: true },
        { name: 'labelZh', label: t('labelZh'), required: true },
        { name: 'icon', label: t('iconLabel') },
        { name: 'showOnHome', label: t('showOnHome'), kind: 'select', options: boolOptions, initialValue: 'n' },
      ],
      onSubmit: async (v) => {
        await adminApi.createCategory({
          type: v.type as (typeof CATEGORY_TYPES)[number],
          key: v.key.trim(),
          labelEn: v.labelEn.trim(),
          labelZh: v.labelZh.trim(),
          sortOrder: categories.length,
          enabled: true,
          icon: v.icon.trim() || null,
          showOnHome: v.showOnHome === 'y',
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
        { name: 'icon', label: t('iconLabel'), initialValue: row.icon ?? '' },
        { name: 'showOnHome', label: t('showOnHome'), kind: 'select', options: boolOptions, initialValue: row.showOnHome ? 'y' : 'n' },
      ],
      onSubmit: async (v) => {
        const sortOrder = Number(v.sortOrder);
        if (!Number.isFinite(sortOrder)) return;
        await adminApi.patchCategory(row.id, { labelEn: v.labelEn.trim(), labelZh: v.labelZh.trim(), sortOrder, icon: v.icon.trim() || null, showOnHome: v.showOnHome === 'y' });
        load();
      },
    });
  }

  return (
    <AppShell title={t('categoriesNav')} description={t('categoriesDesc')}>
      <PageHeader title={t('categoriesNav')} description={t('categoriesDesc')} />
      {error ? <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}

      <div className="space-y-4">
        <Card className="flex items-center justify-between p-4">
          <div>
            <p className="font-medium">{t('categories')}</p>
            <p className="text-xs text-muted-foreground">{t('categoriesDesc')}</p>
          </div>
          <Button onClick={addCategory} size="sm"><Plus className="h-4 w-4" />{t('add')}</Button>
        </Card>
        <DataTable>
          <THead>
            <TH>{t('key')}</TH><TH>{t('type')}</TH><TH>{t('labelEn')}</TH><TH>{t('labelZh')}</TH><TH>{t('iconLabel')}</TH><TH>{t('sortOrder')}</TH><TH>{t('showOnHome')}</TH><TH>{t('status')}</TH><TH className="text-right">{t('actions')}</TH>
          </THead>
          <TBody>
            {categories.map((row) => (
              <TR key={row.id}>
                <TD className="font-mono text-xs">{row.key}</TD>
                <TD className="capitalize">{row.type}</TD>
                <TD>{row.labelEn}</TD>
                <TD>{row.labelZh}</TD>
                <TD>{row.icon ?? '—'}</TD>
                <TD>{row.sortOrder}</TD>
                <TD><Switch checked={!!row.showOnHome} onCheckedChange={() => toggleShowOnHome(row)} aria-label={`${t('showOnHome')} ${row.key}`} /></TD>
                <TD><Switch checked={row.enabled} onCheckedChange={() => toggleCategory(row)} aria-label={`${t('toggle')} ${row.key}`} /></TD>
                <TD className="text-right"><Button onClick={() => editCategory(row)} size="sm" variant="ghost">{t('edit')}</Button></TD>
              </TR>
            ))}
          </TBody>
        </DataTable>
      </div>
      <FormModal config={modal} onClose={() => setModal(null)} />
    </AppShell>
  );
}
