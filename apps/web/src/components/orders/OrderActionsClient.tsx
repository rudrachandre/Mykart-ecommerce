'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cancelOrder, requestReturn, requestReplacement, getInvoice } from '@/lib/api/orders';
import { toast } from 'sonner';
import { Download, XCircle, RotateCcw, RefreshCw, Loader2, Printer } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function OrderActionsClient({
  orderId,
  status,
  paymentStatus,
  token,
  orderItems = [],
}: {
  orderId: string;
  status: string;
  paymentStatus?: string;
  token: string;
  orderItems?: any[];
}) {
  const [loading, setLoading] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [showReplacement, setShowReplacement] = useState(false);
  const [reason, setReason] = useState('');
  const router = useRouter();

  const canCancel = status === 'PENDING' || status === 'PROCESSING';
  const canReturn = status === 'DELIVERED';
  const canReplace = status === 'DELIVERED';

  const handleCancel = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await cancelOrder(token, orderId, reason);
      toast.success('Order cancelled successfully');
      setShowCancel(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel order');
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async () => {
    if (loading || !reason.trim()) return;
    setLoading(true);
    try {
      const itemsPayload = orderItems.map((item) => ({
        orderItemId: item.id,
        quantity: item.quantity,
      }));

      await requestReturn(token, orderId, {
        reason: reason.trim(),
        items: itemsPayload,
      });
      toast.success('Return request submitted successfully');
      setShowReturn(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to request return');
    } finally {
      setLoading(false);
    }
  };

  const handleReplacement = async () => {
    if (loading || !reason.trim()) return;
    setLoading(true);
    try {
      const itemsPayload = orderItems.map((item) => ({
        orderItemId: item.id,
        quantity: item.quantity,
      }));

      await requestReplacement(token, orderId, {
        reason: reason.trim(),
        items: itemsPayload,
      });
      toast.success('Replacement request submitted successfully');
      setShowReplacement(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to request replacement');
    } finally {
      setLoading(false);
    }
  };

  const handleInvoice = async () => {
    try {
      const invoiceData = await getInvoice(token, orderId);

      // Create a printable HTML invoice window
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const itemsHtml = invoiceData.items
          .map(
            (item: any) => `
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.product.name}</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${parseFloat(item.price).toFixed(2)}</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${(parseFloat(item.price) * item.quantity).toFixed(2)}</td>
            </tr>`
          )
          .join('');

        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Invoice #${orderId.slice(0, 8).toUpperCase()}</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #111; }
                .header { display: flex; justify-content: space-between; border-bottom: 2px solid #111; padding-bottom: 20px; margin-bottom: 30px; }
                .title { font-size: 24px; font-weight: 800; }
                .meta { text-align: right; font-size: 13px; color: #555; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
                th { text-align: left; padding: 10px; border-bottom: 2px solid #ddd; text-transform: uppercase; font-size: 11px; }
                .totals { margin-top: 30px; margin-left: auto; width: 300px; font-size: 14px; }
                .totals-row { display: flex; justify-content: space-between; padding: 6px 0; }
                .grand-total { font-weight: 800; font-size: 18px; border-top: 2px solid #111; padding-top: 10px; margin-top: 10px; }
                @media print { button { display: none; } }
              </style>
            </head>
            <body>
              <div style="margin-bottom: 20px;">
                <button onclick="window.print()" style="padding: 8px 16px; background: #111; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Print / Save as PDF</button>
              </div>
              <div class="header">
                <div>
                  <div class="title">MYKART INVOICE</div>
                  <div style="font-size: 13px; margin-top: 4px;">Order ID: #${orderId.toUpperCase()}</div>
                </div>
                <div class="meta">
                  <div>Date: ${new Date(invoiceData.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                  <div>Status: ${invoiceData.status}</div>
                </div>
              </div>

              <div style="display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 13px;">
                <div>
                  <strong>Billed / Shipped To:</strong>
                  <div>${invoiceData.shippingAddress.fullName}</div>
                  <div>${invoiceData.shippingAddress.addressLine1}</div>
                  ${invoiceData.shippingAddress.addressLine2 ? `<div>${invoiceData.shippingAddress.addressLine2}</div>` : ''}
                  <div>${invoiceData.shippingAddress.city}, ${invoiceData.shippingAddress.state} ${invoiceData.shippingAddress.postalCode}</div>
                  <div>Phone: ${invoiceData.shippingAddress.phone}</div>
                </div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th style="text-align: center;">Qty</th>
                    <th style="text-align: right;">Unit Price</th>
                    <th style="text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>

              <div class="totals">
                <div class="totals-row"><span>Subtotal:</span><span>₹${parseFloat(invoiceData.subtotal).toFixed(2)}</span></div>
                <div class="totals-row"><span>Discount:</span><span>-₹${parseFloat(invoiceData.discount || 0).toFixed(2)}</span></div>
                <div class="totals-row"><span>Shipping:</span><span>₹${parseFloat(invoiceData.shippingFee).toFixed(2)}</span></div>
                <div class="totals-row"><span>Tax (GST):</span><span>₹${parseFloat(invoiceData.tax).toFixed(2)}</span></div>
                <div class="totals-row grand-total"><span>Total Paid:</span><span>₹${parseFloat(invoiceData.total).toFixed(2)}</span></div>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        toast.success('Invoice generated for printing');
      } else {
        // Fallback file download if popup blocked
        const blob = new Blob([JSON.stringify(invoiceData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${orderId.slice(0, 8)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Invoice downloaded');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to download invoice');
    }
  };

  if (status === 'CANCELLED' || status === 'REFUNDED' || status === 'RETURNED' || status === 'REPLACED') {
    return (
      <div className="mt-6">
        <Button variant="outline" size="sm" onClick={handleInvoice} className="w-full font-bold uppercase tracking-wider text-xs">
          <Download className="w-4 h-4 mr-2" /> Download Invoice
        </Button>
      </div>
    );
  }

  return (
    <div className="my-6 space-y-4">
      {/* Cancel Action */}
      {canCancel && !showCancel && (
        <Button
          variant="destructive"
          size="sm"
          className="w-full font-bold uppercase tracking-wider text-xs shadow-sm"
          onClick={() => setShowCancel(true)}
        >
          <XCircle className="w-4 h-4 mr-2" /> Cancel Order
        </Button>
      )}

      {canCancel && showCancel && (
        <div className="space-y-3 border border-destructive/20 bg-destructive/5 p-4 rounded-xl">
          <p className="text-xs font-bold text-destructive">Are you sure you want to cancel this order?</p>
          <textarea
            placeholder="Reason for cancellation (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full border border-border bg-background p-2.5 text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
            rows={2}
          />
          <div className="flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCancel}
              disabled={loading}
              className="font-bold text-xs uppercase tracking-wider"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
              {loading ? 'Cancelling...' : 'Confirm Cancel'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCancel(false)}
              className="font-bold text-xs uppercase tracking-wider"
            >
              Keep Order
            </Button>
          </div>
        </div>
      )}

      {/* Return Action */}
      {canReturn && !showReturn && (
        <Button
          variant="outline"
          size="sm"
          className="w-full font-bold uppercase tracking-wider text-xs"
          onClick={() => {
            setShowReturn(true);
            setShowReplacement(false);
          }}
        >
          <RotateCcw className="w-4 h-4 mr-2" /> Request Return
        </Button>
      )}

      {canReturn && showReturn && (
        <div className="space-y-3 border border-border/40 bg-card p-4 rounded-xl">
          <p className="text-xs font-bold text-foreground">Request a return for this order</p>
          <textarea
            placeholder="Please specify why you want to return this order..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full border border-border bg-background p-2.5 text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
            rows={3}
            required
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleReturn}
              disabled={loading || !reason.trim()}
              className="font-bold text-xs uppercase tracking-wider"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
              {loading ? 'Submitting...' : 'Submit Return'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReturn(false)}
              className="font-bold text-xs uppercase tracking-wider"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Replacement Action */}
      {canReplace && !showReplacement && (
        <Button
          variant="outline"
          size="sm"
          className="w-full font-bold uppercase tracking-wider text-xs"
          onClick={() => {
            setShowReplacement(true);
            setShowReturn(false);
          }}
        >
          <RefreshCw className="w-4 h-4 mr-2" /> Request Replacement
        </Button>
      )}

      {canReplace && showReplacement && (
        <div className="space-y-3 border border-border/40 bg-card p-4 rounded-xl">
          <p className="text-xs font-bold text-foreground">Request a replacement for this order</p>
          <textarea
            placeholder="Please specify the reason for requesting a replacement..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full border border-border bg-background p-2.5 text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
            rows={3}
            required
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleReplacement}
              disabled={loading || !reason.trim()}
              className="font-bold text-xs uppercase tracking-wider"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
              {loading ? 'Submitting...' : 'Submit Replacement'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReplacement(false)}
              className="font-bold text-xs uppercase tracking-wider"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Download Invoice Button */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full font-bold uppercase tracking-wider text-xs hover:bg-secondary"
        onClick={handleInvoice}
      >
        <Printer className="w-4 h-4 mr-2" /> Print / Download Invoice
      </Button>
    </div>
  );
}
