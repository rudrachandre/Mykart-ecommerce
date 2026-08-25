'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Cookies from 'js-cookie';
import { deleteProduct } from '@/lib/api/sellers';
import { toast } from 'sonner';

export function ProductActions({ productId, slug }: { productId: string, slug: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
      setLoading(true);
      const token = Cookies.get('accessToken');
      if (!token) throw new Error('Not authenticated');
      
      await deleteProduct(token, productId);
      router.refresh();
    } catch (error) {
      toast.error('Failed to delete product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Link href={`/seller/products/${slug}/edit`}>
        <Button variant="outline" size="sm">Edit</Button>
      </Link>
      <Button variant="destructive" size="sm" onClick={handleDelete} disabled={loading}>
        {loading ? 'Deleting...' : 'Delete'}
      </Button>
    </div>
  );
}
