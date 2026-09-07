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
    value: '' as string | number,
    minimumOrder: '' as string | number,
    maximumDiscount: '' as string | number,
    startDate: '',
    expiryDate: '',
    usageLimit: '' as string | number,
    active: true,
  });

  const [showForm, setShowForm] = useState(false);
  const [filterTab, setFilterTab] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const getAuthToken = () => {
    return Cookies.get('accessToken') || (typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '');
  };

  const isCouponActiveNow = (coupon: any) => {
    if (!coupon.active) return false;
    const now = new Date();
    const isDateValid = (!coupon.startDate || new Date(coupon.startDate) <= now) && (!coupon.expiryDate || new Date(coupon.expiryDate) >= now);
    const isUsageValid = coupon.usageLimit === null || coupon.usageLimit === undefined || (coupon.usedCount || 0) < coupon.usageLimit;
    return isDateValid && isUsageValid;
  };

  const getCouponStatus = (coupon: any) => {
    if (!coupon.active) return { label: 'Inactive', color: 'text-red-700 bg-red-100 dark:bg-red-950/40 border-red-200' };
    const now = new Date();
    if (coupon.startDate && new Date(coupon.startDate) > now) {
      return { label: 'Scheduled', color: 'text-amber-700 bg-amber-100 dark:bg-amber-950/40 border-amber-200' };
    }
    if (coupon.expiryDate && new Date(coupon.expiryDate) < now) {
      return { label: 'Expired', color: 'text-zinc-600 bg-zinc-100 dark:bg-zinc-800 border-zinc-200' };
    }
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return { label: 'Limit Reached', color: 'text-orange-700 bg-orange-100 dark:bg-orange-950/40 border-orange-200' };
    }
    return { label: 'Active', color: 'text-emerald-700 bg-emerald-100 dark:bg-emerald-950/40 border-emerald-200' };
  };

  const loadCoupons = async () => {
    const token = getAuthToken();
    try {
      setLoading(true);
      const data = await getCoupons(token);
      setCoupons(data || []);
    } catch (error: any) {
      toast.error('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'number'
          ? value
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
      value: coupon.value != null ? parseFloat(coupon.value) : '',
      minimumOrder: coupon.minimumOrder ? parseFloat(coupon.minimumOrder) : '',
      maximumDiscount: coupon.maximumDiscount ? parseFloat(coupon.maximumDiscount) : '',
      startDate: coupon.startDate ? new Date(coupon.startDate).toISOString().split('T')[0] : '',
      expiryDate: coupon.expiryDate ? new Date(coupon.expiryDate).toISOString().split('T')[0] : '',
      usageLimit: coupon.usageLimit || '',
      active: coupon.active,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    const token = getAuthToken();
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
    const token = getAuthToken();
    try {
      const minOrderNum = Number(formData.minimumOrder);
      const maxDiscountNum = Number(formData.maximumDiscount);
      const usageLimitNum = Number(formData.usageLimit);

      const payload: any = {
        ...formData,
        value: Number(formData.value || 0),
        minimumOrder: formData.minimumOrder && !isNaN(minOrderNum) && minOrderNum > 0 ? minOrderNum : null,
        maximumDiscount: formData.maximumDiscount && !isNaN(maxDiscountNum) && maxDiscountNum > 0 ? maxDiscountNum : null,
        usageLimit: formData.usageLimit && !isNaN(usageLimitNum) && usageLimitNum > 0 ? usageLimitNum : null,
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
        value: '',
        minimumOrder: '',
        maximumDiscount: '',
        startDate: '',
        expiryDate: '',
        usageLimit: '',
        active: true,
      });
      loadCoupons();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save coupon');
    }
  };

  const displayedCoupons = coupons.filter((c) => {
    if (filterTab === 'ACTIVE') return isCouponActiveNow(c);
    if (filterTab === 'INACTIVE') return !isCouponActiveNow(c);
    return true;
  });

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

      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Button
            variant={filterTab === 'ALL' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterTab('ALL')}
          >
            All ({coupons.length})
          </Button>
          <Button
            variant={filterTab === 'ACTIVE' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterTab('ACTIVE')}
          >
            Active Now ({coupons.filter(isCouponActiveNow).length})
          </Button>
          <Button
            variant={filterTab === 'INACTIVE' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterTab('INACTIVE')}
          >
            Inactive / Expired ({coupons.filter((c) => !isCouponActiveNow(c)).length})
          </Button>
        </div>
      </div>

      {coupons.length === 0 ? (
        <div className="text-center py-16 border rounded-lg bg-muted/20">
          <Gift className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-lg text-muted-foreground">No coupons have been created yet.</p>
        </div>
      ) : displayedCoupons.length === 0 ? (
        <div className="text-center py-16 border rounded-lg bg-muted/20">
          <p className="text-lg text-muted-foreground">No coupons match the selected tab filter.</p>
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
              {displayedCoupons.map((coupon) => (
                <tr key={coupon.id} className="hover:bg-muted/50">
                  <td className="px-6 py-4 font-mono font-bold">{coupon.code}</td>
                  <td className="px-6 py-4">
                    {coupon.type === 'PERCENTAGE'
                      ? `${parseFloat(coupon.value)}%`
                      : `₹${parseFloat(coupon.value).toFixed(2)}`}
                  </td>
                  <td className="px-6 py-4 space-y-1 text-xs">
                    {coupon.minimumOrder && (
                      <p className="text-muted-foreground">Min Order: ₹{parseFloat(coupon.minimumOrder).toFixed(2)}</p>
                    )}
                    {coupon.maximumDiscount && (
                      <p className="text-muted-foreground">Max Discount: ₹{parseFloat(coupon.maximumDiscount).toFixed(2)}</p>
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
                    {(() => {
                      const st = getCouponStatus(coupon);
                      return (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${st.color}`}>
                          {st.label === 'Active' ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                          {st.label}
                        </span>
                      );
                    })()}
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
