'use client';
import { useState } from 'react';
import { createAddress, updateAddress, deleteAddress } from '@/lib/api/users';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Plus, Trash, Edit, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AddressesClient({ initialAddresses, token }: { initialAddresses: any[], token: string }) {
  const [addresses, setAddresses] = useState(initialAddresses);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    isDefault: false,
  });
  const router = useRouter();

  const handleAddNew = () => {
    setFormData({
      fullName: '',
      phone: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      isDefault: false,
    });
    setEditingId(null);
    setIsEditing(true);
  };

  const handleEdit = (addr: any) => {
    setFormData({ ...addr, addressLine2: addr.addressLine2 || '' });
    setEditingId(addr.id);
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this address?')) return;
    try {
      await deleteAddress(token, id);
      setAddresses(addresses.filter(a => a.id !== id));
      toast.success('Address deleted');
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const addr = addresses.find(a => a.id === id);
      if (!addr) return;
      await updateAddress(token, id, { ...addr, isDefault: true });
      toast.success('Default address updated');
      setAddresses(addresses.map(a => ({ ...a, isDefault: a.id === id })));
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || 'Failed to set default');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        const updated = await updateAddress(token, editingId, formData);
        setAddresses(addresses.map(a => a.id === editingId ? updated : (formData.isDefault ? { ...a, isDefault: false } : a)));
        toast.success('Address updated');
      } else {
        const created = await createAddress(token, formData);
        if (formData.isDefault) {
          setAddresses([...addresses.map(a => ({ ...a, isDefault: false })), created]);
        } else {
          setAddresses([...addresses, created]);
        }
        toast.success('Address added');
      }
      setIsEditing(false);
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save address');
    }
  };

  if (isEditing) {
    return (
      <div className="bg-card border border-border/40 p-8 max-w-2xl">
        <h2 className="text-xl font-bold mb-6">{editingId ? 'Edit Address' : 'Add New Address'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Full Name</label>
              <Input value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Phone Number</label>
              <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} required />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Address Line 1</label>
            <Input value={formData.addressLine1} onChange={e => setFormData({ ...formData, addressLine1: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Address Line 2 (Optional)</label>
            <Input value={formData.addressLine2} onChange={e => setFormData({ ...formData, addressLine2: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">City</label>
              <Input value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">State</label>
              <Input value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Postal Code</label>
              <Input value={formData.postalCode} onChange={e => setFormData({ ...formData, postalCode: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Country</label>
              <Input value={formData.country} onChange={e => setFormData({ ...formData, country: e.target.value })} required />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input 
              type="checkbox" 
              id="isDefault" 
              checked={formData.isDefault} 
              onChange={e => setFormData({ ...formData, isDefault: e.target.checked })} 
              className="rounded border-border"
            />
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="isDefault">Set as default address</label>
          </div>
          <div className="flex gap-4 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsEditing(false)} className="uppercase tracking-widest text-xs font-bold">Cancel</Button>
            <Button type="submit" className="uppercase tracking-widest text-xs font-bold">Save Address</Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Button onClick={handleAddNew} className="uppercase tracking-widest text-xs font-bold"><Plus className="w-4 h-4 mr-2" /> Add New Address</Button>
      </div>

      {addresses.length === 0 ? (
        <div className="text-center py-12 border border-border/40 border-dashed bg-muted/20">
          <p className="text-muted-foreground">You don't have any saved addresses.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {addresses.map(addr => (
            <div key={addr.id} className="border border-border/40 bg-card p-6 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg">{addr.fullName}</h3>
                  {addr.isDefault && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest bg-primary/10 text-primary px-2 py-0.5 rounded-full mt-1">
                      <Star className="w-3 h-3 fill-primary" /> Default
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(addr)} className="text-muted-foreground hover:text-foreground transition-colors p-1"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(addr.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1"><Trash className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="text-sm text-foreground/80 space-y-1 mb-6 flex-1">
                <p>{addr.addressLine1}</p>
                {addr.addressLine2 && <p>{addr.addressLine2}</p>}
                <p>{addr.city}, {addr.state} {addr.postalCode}</p>
                <p>{addr.country}</p>
                <p className="pt-2 text-foreground/60 font-medium">Phone: {addr.phone}</p>
              </div>
              {!addr.isDefault && (
                <button 
                  onClick={() => handleSetDefault(addr.id)} 
                  className="text-xs uppercase tracking-widest font-bold text-primary hover:underline text-left mt-auto"
                >
                  Set as Default
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
