'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cancelOrder, requestReturn, requestReplacement, getInvoice } from '@/lib/api/orders';
import { toast } from 'sonner';
import { Download } from 'lucide-react';

export function OrderActionsClient({
  orderId,
  status,
  paymentStatus,
  token,
}: {
  orderId: string;
  status: string;
  paymentStatus?: string;
  token: string;
}) {
  const [loading, setLoading] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [showReplacement, setShowReplacement] = useState(false);
  const [reason, setReason] = useState('');

  const canCancel = status === 'PENDING' || status === 'PROCESSING';
  const canReturn = status === 'DELIVERED';
  const canReplace = status === 'DELIVERED';

  const handleCancel = async () => {
    setLoading(true);
    try {
      await cancelOrder(token, orderId, reason);
      toast.success('Order cancelled successfully');
      setShowCancel(false);
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel order');
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async () => {
    setLoading(true);
    try {
      await requestReturn(token, orderId, {
        reason,
        items: [],
      });
      toast.success('Return request submitted');
      setShowReturn(false);
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || 'Failed to request return');
    } finally {
      setLoading(false);
    }
  };

  const handleReplacement = async () => {
    setLoading(true);
    try {
      await requestReplacement(token, orderId, {
        reason,
        items: [],
      });
      toast.success('Replacement request submitted');
      setShowReplacement(false);
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || 'Failed to request replacement');
    } finally {
      setLoading(false);
    }
  };

  const handleInvoice = async () => {
    try {
      const data = await getInvoice(token, orderId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${orderId.slice(0, 8)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Invoice downloaded');
    } catch (err: any) {
      toast.error(err.message || 'Failed to download invoice');
    }
  };

  if (status === 'CANCELLED' || status === 'REFUNDED' || status === 'RETURNED' || status === 'REPLACED') {
    return null;
  }

  return (
    <div className="mt-8 space-y-4">
      {canCancel && !showCancel && (
        <Button
          variant="destructive"
          className="w-full"
          onClick={() => setShowCancel(true)}
        >
          Cancel Order
        </Button>
      )}
      {canCancel && showCancel && (
        <div className="space-y-4 border border-destructive/20 p-4 rounded-lg">
          <p className="text-sm text-destructive font-medium">Are you sure you want to cancel this order?</p>
          <textarea
            placeholder="Reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full border border-border bg-background p-2 text-sm rounded"
          />
          <div className="flex gap-4">
            <Button variant="destructive" onClick={handleCancel} disabled={loading}>
              {loading ? 'Cancelling...' : 'Confirm Cancel'}
            </Button>
            <Button variant="outline" onClick={() => setShowCancel(false)}>
              Keep Order
            </Button>
          </div>
        </div>
      )}

      {canReturn && !showReturn && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowReturn(true)}
        >
          Request Return
        </Button>
      )}
      {canReturn && showReturn && (
        <div className="space-y-4 border border-border p-4 rounded-lg">
          <p className="text-sm font-medium">Request a return for this order</p>
          <textarea
            placeholder="Return reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full border border-border bg-background p-2 text-sm rounded"
            required
          />
          <div className="flex gap-4">
            <Button onClick={handleReturn} disabled={loading || !reason}>
              {loading ? 'Submitting...' : 'Submit Return Request'}
            </Button>
            <Button variant="outline" onClick={() => setShowReturn(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {canReplace && !showReplacement && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowReplacement(true)}
        >
          Request Replacement
        </Button>
      )}
      {canReplace && showReplacement && (
        <div className="space-y-4 border border-border p-4 rounded-lg">
          <p className="text-sm font-medium">Request a replacement for this order</p>
          <textarea
            placeholder="Replacement reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full border border-border bg-background p-2 text-sm rounded"
            required
          />
          <div className="flex gap-4">
            <Button onClick={handleReplacement} disabled={loading || !reason}>
              {loading ? 'Submitting...' : 'Submit Replacement Request'}
            </Button>
            <Button variant="outline" onClick={() => setShowReplacement(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <Button
        variant="ghost"
        className="w-full"
        onClick={handleInvoice}
      >
        <Download className="w-4 h-4 mr-2" />
        Download Invoice
      </Button>
    </div>
  );
}
