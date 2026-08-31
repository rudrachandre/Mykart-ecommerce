'use client';

import { useState } from 'react';
import { adjustInventoryStock } from '@/lib/api/inventory';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface InventoryAdjustFormProps {
  variantId: string;
  sku: string;
  currentQuantity: number;
  token: string;
  onSuccess: () => void;
}

export function InventoryAdjustForm({
  variantId,
  sku,
  currentQuantity,
  token,
  onSuccess,
}: InventoryAdjustFormProps) {
  const [adjustment, setAdjustment] = useState<number>(0);
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adjustment === 0) {
      toast.error('Adjustment quantity must be non-zero');
      return;
    }

    try {
      setLoading(true);
      await adjustInventoryStock(token, variantId, adjustment, reason);
      toast.success('Stock adjusted successfully');
      setAdjustment(0);
      setReason('');
      setShow(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Failed to adjust stock');
    } finally {
      setLoading(false);
    }
  };

  if (!show) {
    return (
      <Button variant="outline" size="sm" onClick={() => setShow(true)}>
        Adjust Stock
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 p-4 border rounded bg-muted/30 space-y-4 max-w-sm">
      <div className="flex justify-between items-center">
        <h4 className="font-semibold text-xs text-foreground uppercase tracking-widest">Adjust Stock (SKU: {sku})</h4>
        <Button type="button" variant="ghost" size="sm" onClick={() => setShow(false)}>Cancel</Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-muted-foreground">Current Stock</label>
          <p className="text-sm font-medium">{currentQuantity}</p>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-muted-foreground">Change (+ or -)</label>
          <input
            type="number"
            value={adjustment}
            onChange={(e) => setAdjustment(parseInt(e.target.value) || 0)}
            className="w-full p-1 border rounded bg-background text-sm"
            required
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] uppercase font-bold text-muted-foreground">Reason</label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g., Stock count correction, new batch"
          className="w-full p-1 border rounded bg-background text-sm"
          required
        />
      </div>

      <Button type="submit" disabled={loading} size="sm" className="w-full text-xs">
        {loading ? 'Adjusting...' : 'Submit Adjustment'}
      </Button>
    </form>
  );
}
