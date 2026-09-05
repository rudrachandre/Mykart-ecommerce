'use client';
import { useState } from 'react';
import { updateProfile } from '@/lib/api/users';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function ProfileClient({ initialData, token }: { initialData: any, token: string }) {
  const [name, setName] = useState(initialData.name || '');
  const [avatar, setAvatar] = useState(initialData.avatar || '');
  const [isLoading, setIsLoading] = useState(false);
  const { refreshUser } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await updateProfile(token, { name, avatar });
      await refreshUser();
      toast.success('Profile updated successfully');
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="email">Email Address</label>
        <Input id="email" value={initialData.email} disabled className="bg-muted" />
        <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="name">Full Name</label>
        <Input 
          id="name" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          placeholder="Enter your full name" 
          required 
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="avatar">Avatar URL</label>
        <Input 
          id="avatar" 
          value={avatar} 
          onChange={(e) => setAvatar(e.target.value)} 
          placeholder="https://example.com/avatar.jpg" 
        />
      </div>

      <Button type="submit" disabled={isLoading} className="w-full sm:w-auto uppercase tracking-widest text-xs font-bold px-8">
        {isLoading ? 'Saving...' : 'Save Changes'}
      </Button>
    </form>
  );
}
