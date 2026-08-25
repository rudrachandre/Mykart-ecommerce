"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { updateOrderStatus } from "@/lib/api/sellers";
import Cookies from "js-cookie";

export function OrderStatusClient({
  orderId,
  initialStatus,
}: {
  orderId: string;
  initialStatus: string;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleUpdate = async () => {
    setLoading(true);
    setMessage("");
    try {
      const token = Cookies.get("accessToken");
      if (!token) throw new Error("Not authenticated");
      await updateOrderStatus(token, orderId, status);
      setMessage("Status updated successfully");
      router.refresh();
    } catch (err: any) {
      setMessage(err.message || "Failed to update status");
    }
    setLoading(false);
  };

  // Mirrors SellersService.ALLOWED_TRANSITIONS on the backend. The API remains
  // the final authority and still rejects anything illegal with a 400.
  const NEXT_STATUSES: Record<string, string[]> = {
    PENDING: ["PROCESSING", "CANCELLED"],
    PROCESSING: ["SHIPPED"],
    SHIPPED: ["DELIVERED"],
    DELIVERED: [],
    CANCELLED: [],
  };
  const nextStatuses = NEXT_STATUSES[initialStatus] ?? [];

  if (nextStatuses.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          No further status changes are available for a{" "}
          {initialStatus.toLowerCase()} order.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="w-full p-2 border rounded-md bg-background"
      >
        {nextStatuses.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <Button
        onClick={handleUpdate}
        disabled={loading || status === initialStatus}
        className="w-full"
      >
        {loading ? "Updating..." : "Update Status"}
      </Button>

      {message && (
        <p
          className={`text-sm text-center ${message.includes("success") ? "text-green-600" : "text-red-600"}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
