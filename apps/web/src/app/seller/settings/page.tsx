'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Cookies from 'js-cookie';
import { getSellerProfile, updateSellerProfile } from '@/lib/api/sellers';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function SellerSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    storeName: '',
    description: '',
    logo: '',
  });

  const token = Cookies.get('accessToken') || '';

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await getSellerProfile(token);
        setFormData({
          storeName: data.storeName || '',
          description: data.description || '',
          logo: data.logo || '',
        });
      } catch (error) {
        toast.error('Failed to load store profile');
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      loadProfile();
    }
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await updateSellerProfile(token, formData);
      toast.success('Store profile updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update store profile');
    } finally {
      setSaving(false);
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
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <Link href="/seller" className="text-sm text-primary hover:underline mb-2 block">
          &larr; Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold">Store Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your public seller profile and store information
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-card p-6 border rounded-lg">
        <div className="space-y-2">
          <label className="text-sm font-medium">Store Name</label>
          <input
            type="text"
            name="storeName"
            value={formData.storeName}
            onChange={handleChange}
            className="w-full p-2 border rounded-md bg-background"
            required
            placeholder="Awesome Gadgets Store"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Store Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="w-full p-2 border rounded-md bg-background min-h-[120px]"
            placeholder="Describe your store, key products, and quality guarantees..."
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Store Logo URL</label>
          <input
            type="text"
            name="logo"
            value={formData.logo}
            onChange={handleChange}
            className="w-full p-2 border rounded-md bg-background"
            placeholder="https://example.com/logo.jpg"
          />
        </div>

        <div className="pt-4 border-t flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </div>
  );
}
