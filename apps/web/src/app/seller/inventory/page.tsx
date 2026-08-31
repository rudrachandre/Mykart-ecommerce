'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Cookies from 'js-cookie';
import { getSellerProducts } from '@/lib/api/sellers';
import { Button } from '@/components/ui/button';
import { InventoryAdjustForm } from '@/components/seller/InventoryAdjustForm';
import { toast } from 'sonner';

export default function SellerInventoryPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const token = Cookies.get('accessToken') || '';

  const loadInventory = async () => {
    try {
      setLoading(true);
      const data = await getSellerProducts(token);
      setProducts(data);
    } catch (error) {
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadInventory();
    }
  }, [token]);

  const inventoryRows: any[] = [];
  for (const product of products) {
    for (const variant of product.variants || []) {
      const quantity = variant.inventory?.quantity ?? 0;
      const reserved = variant.inventory?.reserved ?? 0;
      const available = quantity - reserved;
      const isLowStock = available <= 10 && available > 0;
      const isOutOfStock = available <= 0;

      inventoryRows.push({
        productId: product.id,
        productName: product.name,
        variantId: variant.id,
        sku: variant.sku,
        color: variant.color,
        size: variant.size,
        quantity,
        reserved,
        available,
        isLowStock,
        isOutOfStock,
      });
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <Link href="/seller" className="text-sm text-primary hover:underline mb-2 block">
            &larr; Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold">Inventory</h1>
        </div>
      </div>

      {inventoryRows.length === 0 ? (
        <div className="text-center py-16 border rounded-lg bg-muted/20">
          <p className="text-lg text-muted-foreground mb-4">No inventory items found.</p>
          <Link href="/seller/products">
            <Button>Manage Products</Button>
          </Link>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-card">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-medium">Product</th>
                <th className="px-6 py-4 font-medium">SKU</th>
                <th className="px-6 py-4 font-medium">Variant</th>
                <th className="px-6 py-4 font-medium">Quantity</th>
                <th className="px-6 py-4 font-medium">Reserved</th>
                <th className="px-6 py-4 font-medium">Available</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Adjustment</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {inventoryRows.map((row) => (
                <tr key={row.variantId} className="hover:bg-muted/50">
                  <td className="px-6 py-4 font-medium">{row.productName}</td>
                  <td className="px-6 py-4 font-mono text-xs">{row.sku}</td>
                  <td className="px-6 py-4">
                    {row.color && <span className="mr-2">{row.color}</span>}
                    {row.size && <span>{row.size}</span>}
                    {!row.color && !row.size && <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-6 py-4">{row.quantity}</td>
                  <td className="px-6 py-4">{row.reserved}</td>
                  <td className="px-6 py-4 font-medium">{row.available}</td>
                  <td className="px-6 py-4">
                    {row.isOutOfStock ? (
                      <span className="rounded-md bg-red-500/20 text-red-700 px-2 py-1 text-[10px] font-bold uppercase tracking-wider">
                        Out of Stock
                      </span>
                    ) : row.isLowStock ? (
                      <span className="rounded-md bg-yellow-500/20 text-yellow-700 px-2 py-1 text-[10px] font-bold uppercase tracking-wider">
                        Low Stock
                      </span>
                    ) : (
                      <span className="rounded-md bg-green-500/20 text-green-700 px-2 py-1 text-[10px] font-bold uppercase tracking-wider">
                        In Stock
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-block text-left">
                      <InventoryAdjustForm
                        variantId={row.variantId}
                        sku={row.sku}
                        currentQuantity={row.quantity}
                        token={token}
                        onSuccess={loadInventory}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
