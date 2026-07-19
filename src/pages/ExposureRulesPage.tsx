import { useCallback, useEffect, useState } from 'react';
import { SlidersHorizontal, Trash2 } from 'lucide-react';
import {
  createExposureRule,
  deactivateExposureRule,
  fetchExposureRules,
  type ExposureRuleRow,
} from '@/api/client';
import { useI18n } from '@/i18n';
import { AppShell } from '@/components/admin/AppShell';
import { PageHeader } from '@/components/admin/PageHeader';
import { EmptyState } from '@/components/admin/EmptyState';
import { DataTable, TBody, TD, TH, THead, TR } from '@/components/admin/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function ExposureRulesPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<ExposureRuleRow[]>([]);
  const [productId, setProductId] = useState('');
  const [ruleType, setRuleType] = useState<ExposureRuleRow['ruleType']>('boost');
  const [weight, setWeight] = useState('1');
  const [targetRegion, setTargetRegion] = useState('');
  const [targetCategory, setTargetCategory] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setItems(await fetchExposureRules());
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    }
  }, [t]);
  useEffect(() => { void load(); }, [load]);

  async function create() {
    const id = Number(productId);
    const exposureWeight = Number(weight);
    if (!Number.isInteger(id) || id <= 0 || !Number.isFinite(exposureWeight)) {
      setError(t('invalidExposureRule'));
      return;
    }
    try {
      await createExposureRule({
        productId: id,
        ruleType,
        exposureWeight,
        targetRegion: targetRegion.trim() || null,
        targetCategory: targetCategory.trim() || null,
        startTime: startTime ? new Date(startTime).toISOString() : null,
        endTime: endTime ? new Date(endTime).toISOString() : null,
        reason: reason.trim() || null,
      });
      setProductId('');
      setReason('');
      setStartTime('');
      setEndTime('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    }
  }

  async function deactivate(id: string) {
    try {
      await deactivateExposureRule(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    }
  }

  return (
    <AppShell title={t('exposureRules')} description={t('exposureRulesDesc')}>
      <PageHeader title={t('exposureRules')} description={t('exposureRulesPageDesc')} />
      {error ? <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
      <Card className="mb-5 grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-6">
        <div><Label>{t('productId')}</Label><Input value={productId} onChange={(e) => setProductId(e.target.value)} inputMode="numeric" /></div>
        <div>
          <Label>{t('ruleType')}</Label>
          <Select value={ruleType} onValueChange={(value) => setRuleType(value as ExposureRuleRow['ruleType'])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="boost">{t('boost')}</SelectItem>
              <SelectItem value="suppress">{t('suppress')}</SelectItem>
              <SelectItem value="pin">{t('pin')}</SelectItem>
              <SelectItem value="exclude">{t('exclude')}</SelectItem>
              <SelectItem value="regional">{t('regional')}</SelectItem>
              <SelectItem value="category">{t('categoryRule')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>{t('exposureWeight')}</Label><Input value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" /></div>
        <div><Label>{t('targetRegion')}</Label><Input value={targetRegion} onChange={(e) => setTargetRegion(e.target.value)} /></div>
        <div><Label>{t('targetCategory')}</Label><Input value={targetCategory} onChange={(e) => setTargetCategory(e.target.value)} /></div>
        <div><Label>{t('startTime')}</Label><Input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></div>
        <div><Label>{t('endTime')}</Label><Input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></div>
        <div className="flex items-end"><Button className="w-full" onClick={create}>{t('add')}</Button></div>
        <div className="md:col-span-2 xl:col-span-6"><Label>{t('reason')}</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} /></div>
      </Card>
      {items.length === 0 ? (
        <EmptyState icon={<SlidersHorizontal className="h-5 w-5" />} title={t('noItems')} description={t('emptyExposureRules')} />
      ) : (
        <DataTable>
          <THead>
            <TH>{t('productId')}</TH><TH>{t('ruleType')}</TH><TH>{t('exposureWeight')}</TH>
            <TH>{t('target')}</TH><TH>{t('schedule')}</TH><TH>{t('reason')}</TH><TH>{t('status')}</TH><TH className="text-right">{t('actions')}</TH>
          </THead>
          <TBody>
            {items.map((row) => (
              <TR key={row.id}>
                <TD>#{row.productId}</TD>
                <TD><Badge variant="outline">{row.ruleType}</Badge></TD>
                <TD>{row.exposureWeight}</TD>
                <TD>{row.targetRegion || row.targetCategory || '—'}</TD>
                <TD>{row.startTime || row.endTime ? `${row.startTime ? new Date(row.startTime).toLocaleString() : 'Now'} → ${row.endTime ? new Date(row.endTime).toLocaleString() : '∞'}` : '—'}</TD>
                <TD className="max-w-[260px] truncate">{row.reason || '—'}</TD>
                <TD><Badge variant={row.status === 'active' ? 'default' : 'outline'}>{row.status}</Badge></TD>
                <TD className="text-right">
                  <Button variant="ghost" size="icon" disabled={row.status !== 'active'} onClick={() => deactivate(row.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </DataTable>
      )}
    </AppShell>
  );
}
