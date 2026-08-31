'use client';

import { useState } from 'react';
import Image, { ImageProps } from 'next/image';

interface ProductImageProps extends Omit<ImageProps, 'src' | 'onError'> {
  src?: string | null;
  alt: string;
  fallbackText?: string;
}

const DEFAULT_PLACEHOLDER =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400" fill="%23F3F4F6"><rect width="400" height="400" fill="%23F3F4F6"/><path d="M160 180C160 168.954 168.954 160 180 160H220C231.046 160 240 168.954 240 180V220C240 231.046 231.046 240 220 240H180C168.954 240 160 231.046 160 220V180Z" stroke="%239CA3AF" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="185" cy="185" r="8" fill="%239CA3AF"/><path d="M168 228L188 208L204 220L220 200L232 216" stroke="%239CA3AF" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><text x="50%" y="280" dominant-baseline="middle" text-anchor="middle" fill="%236B7280" font-family="system-ui, sans-serif" font-size="14" font-weight="600">MYKART</text></svg>';

export function ProductImage({
  src,
  alt,
  className,
  fill = true,
  sizes = '(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw',
  ...props
}: ProductImageProps) {
  const [imgSrc, setImgSrc] = useState<string>(src || DEFAULT_PLACEHOLDER);
  const [hasError, setHasError] = useState(false);

  return (
    <Image
      src={hasError || !imgSrc ? DEFAULT_PLACEHOLDER : imgSrc}
      alt={alt || 'MyKart Product'}
      fill={fill}
      sizes={sizes}
      className={className}
      onError={() => {
        setHasError(true);
        setImgSrc(DEFAULT_PLACEHOLDER);
      }}
      {...props}
    />
  );
}
