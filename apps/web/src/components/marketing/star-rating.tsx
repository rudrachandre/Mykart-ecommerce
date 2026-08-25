import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Figma §9/§10 — row of five 16px stroke-style stars (#FFB000), gap 2px.
 * Optional review count rendered beside in Geist Regular 13px.
 */
export function StarRating({
  value,
  count,
  size = 16,
  className,
}: {
  value?: number | string | null;
  count?: number | null;
  size?: number;
  className?: string;
}) {
  const rating = Math.round(Number(value ?? 0));
  const hasRating = Number(value ?? 0) > 0;
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span
        className="inline-flex items-center gap-[2px]"
        role="img"
        aria-label={`${Number(value ?? 0).toFixed(1)} out of 5 stars`}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            style={{ width: size, height: size }}
            className={
              i < rating
                ? 'fill-[#FFB000] stroke-[#FFB000]'
                : 'stroke-[#FFB000]/60 fill-transparent'
            }
            strokeWidth={1.5}
            aria-hidden="true"
          />
        ))}
      </span>
      {count != null && count > 0 && (
        <span className="text-[13px] leading-none text-muted-foreground">
          ({count})
        </span>
      )}
      {!hasRating && !(count != null && count > 0) && (
        <span className="text-[13px] leading-none text-muted-foreground">No reviews yet</span>
      )}
    </span>
  );
}