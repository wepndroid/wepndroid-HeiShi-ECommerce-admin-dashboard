import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

// Circular user avatar. Mirrors the mobile app's SellerAvatar: shows the image when an
// avatarUrl is present, otherwise falls back to a neutral person icon on a muted background.
export function Avatar({
  src,
  name,
  size = 32,
  className,
}: {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground',
        className,
      )}
      style={{ width: size, height: size }}
      aria-label={name ?? undefined}
    >
      {src ? (
        <img src={src} alt={name ?? ''} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <User style={{ width: Math.round(size * 0.5), height: Math.round(size * 0.5) }} strokeWidth={2} aria-hidden />
      )}
    </span>
  );
}
