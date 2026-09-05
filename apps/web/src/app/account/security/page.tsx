import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/api/users';
import ChangePasswordClient from '../password/ChangePasswordClient';
import { Shield, Key, CheckCircle, Smartphone } from 'lucide-react';

export const metadata = {
  title: 'Security Settings | MyKart',
  description: 'Manage your password and security preferences.',
};

export default async function SecurityPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  if (!token) redirect('/login');

  let profile: any = null;
  try {
    profile = await getProfile(token);
  } catch (err) {
    // Best effort fallback
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight mb-2">Account Security</h1>
        <p className="text-muted-foreground">Ensure your account remains safe and protected.</p>
      </div>

      {/* Security Overview Status Card */}
      <div className="bg-secondary border border-border/40 p-6 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold">Account Protection</h2>
              <span className="bg-emerald-500/10 text-emerald-600 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Active
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Signed in as <span className="font-medium text-foreground">{profile?.email || 'Authenticated User'}</span> ({profile?.role || 'CUSTOMER'})
            </p>
          </div>
        </div>
      </div>

      {/* Password Change Form Container */}
      <div className="border border-border/40 bg-card p-6 md:p-8 rounded-xl max-w-2xl">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/40">
          <Key className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">Change Password</h2>
        </div>
        <ChangePasswordClient token={token} />
      </div>
    </div>
  );
}
