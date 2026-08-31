'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Cookies from 'js-cookie';
import { getSettings, updateSettings } from '@/lib/api/admin';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Settings, Save, Shield } from 'lucide-react';

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    siteName: '',
    supportEmail: '',
    maintenanceMode: false,
    allowSellerRegistration: true,
  });

  const token = Cookies.get('accessToken') || '';

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const data = await getSettings(token);
        setFormData({
          siteName: data.siteName || '',
          supportEmail: data.supportEmail || '',
          maintenanceMode: !!data.maintenanceMode,
          allowSellerRegistration: !!data.allowSellerRegistration,
        });
      } catch (error) {
        toast.error('Failed to load system settings');
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      loadSettings();
    }
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await updateSettings(token, formData);
      toast.success('System settings saved successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save system settings');
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
    <div className="max-w-2xl mx-auto py-8">
      <div className="mb-8">
        <Link href="/admin" className="text-sm text-primary hover:underline mb-2 block">
          &larr; Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="w-8 h-8 text-primary" /> Platform Settings
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Configure global application variables and controls.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-card p-6 border rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-3 mb-6">
          <Shield className="w-5 h-5 text-primary" /> System Configuration
        </h3>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Site Name</label>
          <input
            type="text"
            name="siteName"
            value={formData.siteName}
            onChange={handleChange}
            className="w-full p-2 border rounded-md bg-background text-sm"
            required
            placeholder="MyKart Marketplace"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Support Helpdesk Email</label>
          <input
            type="email"
            name="supportEmail"
            value={formData.supportEmail}
            onChange={handleChange}
            className="w-full p-2 border rounded-md bg-background text-sm"
            required
            placeholder="support@mykart.com"
          />
        </div>

        <div className="space-y-4 pt-4 border-t">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-semibold">Maintenance Mode</p>
              <p className="text-xs text-muted-foreground">Block checkout operations for routine updates.</p>
            </div>
            <input
              type="checkbox"
              name="maintenanceMode"
              checked={formData.maintenanceMode}
              onChange={handleChange}
              className="w-5 h-5 rounded"
            />
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <div>
              <p className="text-sm font-semibold">Allow Seller Registration</p>
              <p className="text-xs text-muted-foreground">Toggle public seller onboarding portals.</p>
            </div>
            <input
              type="checkbox"
              name="allowSellerRegistration"
              checked={formData.allowSellerRegistration}
              onChange={handleChange}
              className="w-5 h-5 rounded"
            />
          </div>
        </div>

        <div className="pt-6 border-t flex justify-end">
          <Button type="submit" disabled={saving} className="gap-2">
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </form>
    </div>
  );
}
