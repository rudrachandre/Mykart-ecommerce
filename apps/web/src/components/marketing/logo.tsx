import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Figma §8/§23 — orange 32px icon box (rounded-8) with white cart glyph
 * + "mykart" wordmark in Outfit ExtraBold. Two variants: nav / footer.
 */
export function Logo({
  variant = 'nav',
  className,
}: {
  variant?: 'nav' | 'footer';
  className?: string;
}) {
  const box = variant === 'nav' ? 'h-8 w-8 rounded-lg' : 'h-7 w-7 rounded-md';
  const icon = variant === 'nav' ? 'h-[18px] w-[18px]' : 'h-4 w-4';
  const word = variant === 'nav' ? 'text-[22px]' : 'text-xl';
  return (
    <Link href="/" className={cn('flex items-center gap-2 shrink-0', className)} aria-label="mykart home">
      <span className={cn('flex items-center justify-center bg-brand', box)}>
        <ShoppingBag className={cn('text-white', icon)} strokeWidth={2} aria-hidden="true" />
      </span>
      <span className={cn('font-display font-extrabold tracking-tight text-foreground', word)}>
        mykart
      </span>
    </Link>
  );
}