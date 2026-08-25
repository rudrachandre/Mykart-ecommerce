'use client';
import { useState } from 'react';
import { changePassword } from '@/lib/api/users';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';


export default function ChangePasswordClient({ token }: { token: string }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    try {
      await changePassword(token, { currentPassword, newPassword });
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="current">Current Password</label>
        <Input 
          id="current" 
          type="password"
          value={currentPassword} 
          onChange={(e) => setCurrentPassword(e.target.value)} 
          required 
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="new">New Password</label>
        <Input 
          id="new" 
          type="password"
          value={newPassword} 
          onChange={(e) => setNewPassword(e.target.value)} 
          required 
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="confirm">Confirm New Password</label>
        <Input 
          id="confirm" 
          type="password"
          value={confirmPassword} 
          onChange={(e) => setConfirmPassword(e.target.value)} 
          required 
        />
      </div>

      <Button type="submit" disabled={isLoading} className="w-full sm:w-auto uppercase tracking-widest text-xs font-bold px-8">
        {isLoading ? 'Updating...' : 'Update Password'}
      </Button>
    </form>
  );
}
