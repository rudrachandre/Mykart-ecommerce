'use client';

import { useState } from 'react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { addToCart } from '@/lib/api/cart';

type Variant = { id: string; inventory?: { quantity?: number } };

export function AddToCartButton({ productId, variants }: { productId: string; variants: Variant[] }) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');

  const variant = variants.find((item) => (item.inventory?.quantity ?? 0) > 0);

  async function handleAddToCart() {
    const token = Cookies.get('accessToken');
    if (!token) {
      router.push('/login?callbackUrl=/products');
      return;
    }

    if (!variant) {
      setError('This product is currently out of stock.');
      return;
    }

    setIsAdding(true);
    setError('');
    try {
      await addToCart(token, productId, variant.id, 1);
      router.push('/cart');
      router.refresh();
    } catch {
      setError('Unable to add this product to your cart. Please try again.');
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <div className="flex-1 w-full">
      <Button 
        size="lg" 
        className="w-full h-14 rounded-none bg-foreground text-background hover:bg-foreground/90 uppercase tracking-widest text-xs font-bold transition-all" 
        onClick={handleAddToCart} 
        disabled={isAdding || !variant}
      >
        {isAdding ? 'Adding...' : 'Add to Cart'}
      </Button>
      {error && <p className="mt-2 text-sm text-destructive font-medium" role="alert">{error}</p>}
    </div>
  );
}
