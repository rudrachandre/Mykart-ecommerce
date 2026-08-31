'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { approveReturn, rejectReturn } from '@/lib/api/sellers';
import { toast } from 'sonner';

interface ReturnActionsClientProps {
  orderId: string;
  returnId: string;
  token: string;
}

export function ReturnActionsClient({ orderId, returnId, token }: ReturnActionsClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    try {
      setLoading(true);
      await approveReturn(token, orderId, returnId);
      toast.success('Return approved successfully');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve return');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    try {
      setLoading(true);
      await rejectReturn(token, orderId, returnId);
      toast.success('Return rejected successfully');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject return');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        onClick={handleApprove}
        disabled={loading}
        size="sm"
        className="bg-green-600 hover:bg-green-700"
      >
        {loading ? 'Processing...' : 'Approve'}
      </Button>
      <Button
        onClick={handleReject}
        disabled={loading}
        size="sm"
        variant="destructive"
      >
        {loading ? 'Processing...' : 'Reject'}
      </Button>
    </div>
  );
}
