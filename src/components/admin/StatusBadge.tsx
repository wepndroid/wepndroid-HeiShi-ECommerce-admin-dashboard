import { cn } from '@/lib/utils';
import { useI18n, type Messages } from '@/i18n';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';

const TONE_CLASS: Record<Tone, string> = {
  success: 'bg-success/10 text-success-foreground ring-success/25 dark:text-success',
  warning: 'bg-warning/15 text-warning-foreground ring-warning/30 dark:text-warning',
  danger: 'bg-destructive/10 text-destructive ring-destructive/25',
  info: 'bg-info/10 text-info-foreground ring-info/25 dark:text-info',
  neutral: 'bg-muted text-muted-foreground ring-border',
  primary: 'bg-primary/10 text-primary ring-primary/20',
};

const STATUS_TONE: Record<string, Tone> = {
  approved: 'success',
  active: 'success',
  normal: 'success',
  paid: 'success',
  completed: 'success',
  resolved: 'success',
  enabled: 'success',
  online: 'success',
  pending: 'warning',
  pendingReview: 'warning',
  needsReview: 'warning',
  inDispute: 'warning',
  warned: 'warning',
  urgent: 'danger',
  rejected: 'danger',
  removed: 'danger',
  banned: 'danger',
  abnormal: 'danger',
  refundInProgress: 'info',
  processing: 'info',
  disabled: 'neutral',
};

const STATUS_I18N: Partial<Record<string, keyof Messages>> = {
  pendingReview: 'pendingReview',
  needsReview: 'statusNeedsReview',
  inDispute: 'statusInDispute',
  refundInProgress: 'statusRefundInProgress',
  approved: 'statusApproved',
  rejected: 'statusRejected',
  removed: 'statusRemoved',
  pending: 'statusPending',
  normal: 'statusNormal',
  banned: 'statusBanned',
};

function humanize(value: string) {
  const spaced = value.replace(/([A-Z])/g, ' $1').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function StatusBadge({ status, className }: { status: string | null | undefined; className?: string }) {
  const { t } = useI18n();
  const value = status ?? '—';
  const tone = STATUS_TONE[value] ?? 'neutral';
  const labelKey = STATUS_I18N[value];
  const label = labelKey ? t(labelKey) : humanize(value);

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset whitespace-nowrap',
        TONE_CLASS[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}
