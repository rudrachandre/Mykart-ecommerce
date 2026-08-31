'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Cookies from 'js-cookie';
import { getCoupons, createCoupon, updateCoupon, deleteCoupon } from '@/lib/api/sellers';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Gift, Trash, Edit, Check, X, Plus } from 'lucide-react';

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    type: 'PERCENTAGE',
    value: 0,
    minimumOrder: 0,
    maximumDiscount: 0,
    startDate: '',
    expiryDate: '',
    usageLimit: 0,
    active: true,
  });

  const [showForm, setShowForm] = useState(false);
  const token = Cookies.get('accessToken') || '';

  const loadCoupons = async () => {
    try {
      setLoading(true);
      const data = await getCoupons(token);
      setCoupons(data);
    } catch (error: any) {
      toast.error('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadCoupons();
    }
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'number'
          ? parseFloat(value) || 0
          : name === 'active'
          ? (e.target as HTMLInputElement).checked
          : value,
    }));
  };

  const handleEdit = (coupon: any) => {
    setEditingId(coupon.id);
    setFormData({
      code: coupon.code,
      type: coupon.type,
      value: parseFloat(coupon.value) || 0,
      minimumOrder: coupon.minimumOrder ? parseFloat(coupon.minimumOrder) : 0,
      maximumDiscount: coupon.maximumDiscount ? parseFloat(coupon.maximumDiscount) : 0,
      startDate: new Date(coupon.startDate).toISOString().split('T')[0],
      expiryDate: new Date(coupon.expiryDate).toISOString().split('T')[0],
      usageLimit: coupon.usageLimit || 0,
      active: coupon.active,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    try {
      await deleteCoupon(token, id);
      toast.success('Coupon deleted');
      loadCoupons();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete coupon');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        ...formData,
        value: Number(formData.value),
        minimumOrder: formData.minimumOrder > 0 ? Number(formData.minimumOrder) : null,
        maximumDiscount: formData.maximumDiscount > 0 ? Number(formData.maximumDiscount) : null,
        usageLimit: formData.usageLimit > 0 ? Number(formData.usageLimit) : null,
      };

      if (editingId) {
        await updateCoupon(token, editingId, payload);
        toast.success('Coupon updated successfully');
      } else {
        await createCoupon(token, payload);
        toast.success('Coupon created successfully');
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({
        code: '',
        type: 'PERCENTAGE',
        value: 0,
        minimumOrder: 0,
        maximumDiscount: 0,
        startDate: '',
        expiryDate: '',
        usageLimit: 0,
        active: true,
      });
      loadCoupons();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save coupon');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <Link href="/admin" className="text-sm text-primary hover:underline mb-2 block">
            &larr; Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Gift className="w-8 h-8 text-primary" /> Platform Coupons
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create and manage global checkout discount coupons.
          </p>
        </div>
        <Button onClick={() => { setShowForm(!showForm); setEditingId(null); }} className="gap-2">
          <Plus className="w-4 h-4" /> {showForm ? 'Cancel' : 'Create Coupon'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card p-6 border rounded-lg mb-8 space-y-6">
          <h2 className="text-xl font-bold">{editingId ? 'Edit Coupon' : 'Create Coupon'}</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Coupon Code (Uppercase)</label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                className="w-full p-2 border rounded-md bg-background text-sm"
                required
                placeholder="PROMO20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Discount Type</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full p-2 border rounded-md bg-background text-sm"
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED">Fixed Amount (₹)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Discount Value</label>
              <input
                type="number"
                name="value"
                value={formData.value}
                onChange={handleChange}
                className="w-full p-2 border rounded-md bg-background text-sm"
                required
                min="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Minimum Order Value (Optional, ₹)</label>
              <input
                type="number"
                name="minimumOrder"
                value={formData.minimumOrder}
                onChange={handleChange}
                className="w-full p-2 border rounded-md bg-background text-sm"
                min="0"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Maximum Discount Amount (Optional, ₹)</label>
              <input
                type="number"
                name="maximumDiscount"
                value={formData.maximumDiscount}
                onChange={handleChange}
                className="w-full p-2 border rounded-md bg-background text-sm"
                min="0"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Usage Limit per Coupon (Optional)</label>
              <input
                type="number"
                name="usageLimit"
                value={formData.usageLimit}
                onChange={handleChange}
                className="w-full p-2 border rounded-md bg-background text-sm"
                min="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className="w-full p-2 border rounded-md bg-background text-sm"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Expiry Date</label>
              <input
                type="date"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleChange}
                className="w-full p-2 border rounded-md bg-background text-sm"
                required
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="active"
              id="active"
              checked={formData.active}
              onChange={(e) => setFormData((prev) => ({ ...prev, active: e.target.checked }))}
              className="rounded animate-pulse"
            />
            <label htmlFor="active" className="text-sm font-medium">Active (Available for Checkout)</label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editingId ? 'Save Changes' : 'Create Coupon'}
            </Button>
          </div>
        </form>
      )}

      {coupons.length === 0 ? (
        <div className="text-center py-16 border rounded-lg bg-muted/20">
          <Gift className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-lg text-muted-foreground">No coupons have been created yet.</p>
        </div>
      ) : (
        <div className="border rounded-lg bg-card overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground border-b text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">Value</th>
                <th className="px-6 py-4">Conditions</th>
                <th className="px-6 py-4">Usage</th>
                <th className="px-6 py-4">Validity</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {coupons.map((coupon) => (
                <tr key={coupon.id} className="hover:bg-muted/50">
                  <td className="px-6 py-4 font-mono font-bold">{coupon.code}</td>
                  <td className="px-6 py-4">
                    {coupon.type === 'PERCENTAGE'
                      ? `${parseFloat(coupon.value)}%`
                      : `₹${parseFloat(coupon.value).toFixed(2)}`}
                  </td>
                  <td className="px-6 py-4 space-y-1 text-xs">
                    {coupon.minimumOrder && (
                      <p className="text-muted-foreground">Min Order: ₹{parseFloat(coupon.minimumOrder)}</p>
                    )}
                    {coupon.maximumDiscount && (
                      <p className="text-muted-foreground">Max Discount: ₹{parseFloat(coupon.maximumDiscount)}</p>
                    )}
                    {!coupon.minimumOrder && !coupon.maximumDiscount && <span>—</span>}
                  </td>
                  <td className="px-6 py-4 text-xs">
                    {coupon.usedCount} used
                    {coupon.usageLimit && ` / ${coupon.usageLimit} max`}
                  </td>
                  <td className="px-6 py-4 text-xs space-y-1">
                    <p>Start: {new Date(coupon.startDate).toLocaleDateString()}</p>
                    <p>End: {new Date(coupon.expiryDate).toLocaleDateString()}</p>
                  </td>
                  <td className="px-6 py-4">
                    {coupon.active ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-green-600">
                        <Check className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-bold text-red-500">
                        <X className="w-3 h-3" /> Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(coupon)}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(coupon.id)}>
                        <Trash className="w-3.5 h-3.5" />
                      </Button>
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
