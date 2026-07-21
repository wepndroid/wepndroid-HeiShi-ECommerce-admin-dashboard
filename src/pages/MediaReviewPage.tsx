import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Images } from 'lucide-react';
import {
  fetchMediaAssets,
  moderateMediaAsset,
  type MediaAssetRow,
} from '@/api/client';
import { useI18n } from '@/i18n';
import { AppShell } from '@/components/admin/AppShell';
import { PageHeader } from '@/components/admin/PageHeader';
import { EmptyState } from '@/components/admin/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

type Filter = 'pending' | 'approved' | 'rejected' | 'all';

export default function MediaReviewPage() {
  const { t } = useI18n();
  const [filter, setFilter] = useState<Filter>('pending');
  const [items, setItems] = useState<MediaAssetRow[] | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [workingId, setWorkingId] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setItems(null);
    setError('');
    try {
      setItems(await fetchMediaAssets(filter === 'all' ? undefined : filter));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
      setItems([]);
    }
  }, [filter, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(asset: MediaAssetRow, decision: 'approve' | 'reject') {
    const reason = reasons[asset.id]?.trim();
    if (decision === 'reject' && !reason) {
      setError(t('mediaRejectReasonRequired'));
      return;
    }
    setWorkingId(asset.id);
    setError('');
    try {
      await moderateMediaAsset(asset.id, decision, reason);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    } finally {
      setWorkingId('');
    }
  }

  return (
    <AppShell title={t('mediaReview')} description={t('mediaReviewDesc')}>
      <PageHeader title={t('mediaReview')} description={t('mediaReviewPageDesc')} />

      {error ? (
        <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)} className="mb-5">
        <TabsList>
          <TabsTrigger value="pending">{t('pending')}</TabsTrigger>
          <TabsTrigger value="approved">{t('approved')}</TabsTrigger>
          <TabsTrigger value="rejected">{t('rejected')}</TabsTrigger>
          <TabsTrigger value="all">{t('filterAll')}</TabsTrigger>
        </TabsList>
      </Tabs>

      {items === null ? (
        <p className="text-sm text-muted-foreground">{t('loading')}</p>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Images className="h-5 w-5" />}
          title={t('noItems')}
          description={t('emptyMediaReview')}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {items.map((asset) => {
            const previewUrl = asset.thumbnailUrl || asset.originalUrl;
            const canModerate = asset.status === 'READY' || asset.status === 'REJECTED';
            return (
              <Card key={asset.id} className="overflow-hidden">
                <div className="flex h-56 items-center justify-center bg-muted/50">
                  {previewUrl && asset.mediaType === 'image' ? (
                    <img
                      src={previewUrl}
                      alt=""
                      className="h-full w-full object-contain"
                      loading="lazy"
                    />
                  ) : previewUrl && asset.mediaType === 'video' ? (
                    <video
                      src={asset.originalUrl || previewUrl}
                      poster={asset.thumbnailUrl || undefined}
                      controls
                      preload="metadata"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <Images className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>

                <div className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{asset.mediaType}</Badge>
                    <Badge
                      variant={asset.moderationStatus === 'rejected' ? 'destructive' : 'secondary'}
                    >
                      {asset.moderationStatus}
                    </Badge>
                    <Badge variant="outline">{asset.status}</Badge>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>
                      {asset.contentType} ·{' '}
                      {asset.fileSize ? `${(asset.fileSize / 1024 / 1024).toFixed(2)} MB` : '—'}
                    </p>
                    <p>
                      {asset.width && asset.height ? `${asset.width} × ${asset.height}` : '—'}
                      {asset.durationSeconds ? ` · ${asset.durationSeconds.toFixed(1)}s` : ''}
                    </p>
                    <p>
                      {t('listingLabel')}: {asset.listingId ? `#${asset.listingId}` : t('notAttached')}
                    </p>
                    <p className="truncate" title={asset.ownerId}>
                      {t('userId')}: {asset.ownerId}
                    </p>
                  </div>
                  {asset.originalUrl ? (
                    <a
                      href={asset.originalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      {t('openOriginal')} <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : null}
                  {asset.processingError ? (
                    <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                      {asset.processingError}
                    </p>
                  ) : null}
                  <Textarea
                    value={reasons[asset.id] || ''}
                    onChange={(event) =>
                      setReasons((current) => ({
                        ...current,
                        [asset.id]: event.target.value,
                      }))
                    }
                    placeholder={t('moderationReason')}
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      disabled={!canModerate || workingId === asset.id}
                      onClick={() => void decide(asset, 'approve')}
                    >
                      {t('approve')}
                    </Button>
                    <Button
                      className="flex-1"
                      variant="destructive"
                      disabled={!canModerate || workingId === asset.id}
                      onClick={() => void decide(asset, 'reject')}
                    >
                      {t('reject')}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
