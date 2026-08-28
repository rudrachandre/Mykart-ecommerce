'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { getAdminProducts, getSellers } from '@/lib/api/admin';
import { getLowStockItems, bulkUpdateInventory } from '@/lib/api/inventory';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function AdminInventoryPage() {
  const router = useRouter();
  const [inventory, setInventory] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState(10);
  const [sellerFilter, setSellerFilter] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(0);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const token = Cookies.get('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const [sellersData, inventoryData] = await Promise.all([
          getSellers(token, 0, 100),
          getLowStockItems(token, {
            threshold,
            sellerId: sellerFilter || undefined,
          }),
        ]);
        setSellers(sellersData.sellers || []);
        setInventory(inventoryData.items || []);
      } catch (err) {
        toast.error('Failed to load inventory data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, threshold, sellerFilter]);

  const handleUpdateQuantity = async (variantId: string) => {
    if (editQuantity < 0) {
      toast.error('Quantity cannot be negative');
      return;
    }

    setUpdating(true);
    try {
      const token = Cookies.get('accessToken');
      if (!token) return;

      await bulkUpdateInventory(token, [
        { variantId, quantity: editQuantity },
      ]);

      toast.success('Inventory updated');
      setEditingId(null);

      const inventoryData = await getLowStockItems(token, {
        threshold,
        sellerId: sellerFilter || undefined,
      });
      setInventory(inventoryData.items || []);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update inventory');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Platform Inventory</h1>
        <div className="flex gap-4">
          <input
            type="number"
            placeholder="Threshold"
            value={threshold}
            onChange={(e) => setThreshold(parseInt(e.target.value) || 0)}
            className="border p-2 rounded w-24 bg-background"
            min={0}
          />
          <select
            value={sellerFilter}
            onChange={(e) => setSellerFilter(e.target.value)}
            className="border p-2 rounded bg-background"
          >
            <option value="">All Sellers</option>
            {sellers.map((seller: any) => (
              <option key={seller.id} value={seller.id}>
                {seller.storeName} ({seller.user?.email})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Loading...</div>
      ) : inventory.length === 0 ? (
        <div className="text-center py-16 border rounded-lg bg-muted/20">
          <p className="text-lg text-muted-foreground">No low-stock items found.</p>
        </div>
      ) : (
        <div className="bg-card border rounded-lg overflow-hidden shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 font-medium text-muted-foreground border-b">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Seller</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Reserved</th>
                <th className="px-4 py-3">Available</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {inventory.map((item) => (
                <tr key={item.variantId} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{item.productName}</td>
                  <td className="px-4 py-3">
                    {sellers.find((s: any) => s.id === item.sellerId)?.storeName || item.sellerId}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{item.sku}</td>
                  <td className="px-4 py-3">{item.quantity}</td>
                  <td className="px-4 py-3">{item.reserved}</td>
                  <td className="px-4 py-3 font-medium">{item.available}</td>
                  <td className="px-4 py-3">
                    {editingId === item.variantId ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={editQuantity}
                          onChange={(e) => setEditQuantity(parseInt(e.target.value) || 0)}
                          className="border p-1 rounded w-20 bg-background"
                          min={0}
                        />
                        <Button
                          size="sm"
                          onClick={() => handleUpdateQuantity(item.variantId)}
                          disabled={updating}
                        >
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingId(null)}
                          disabled={updating}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingId(item.variantId);
                          setEditQuantity(item.quantity);
                        }}
                      >
                        Update
                      </Button>
                    )}
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
