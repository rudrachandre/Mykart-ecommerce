import { cookies } from 'next/headers';
import { getProfile } from '@/lib/api/users';
import { redirect } from 'next/navigation';
import ProfileClient from './ProfileClient';

export const metadata = {
  title: 'Edit Profile | MyKart',
};

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  if (!token) redirect('/login');

  const profile = await getProfile(token);

  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight mb-2">Edit Profile</h1>
      <p className="text-muted-foreground mb-8">Update your personal information.</p>
      
      <div className="max-w-2xl bg-card border border-border/40 p-8">
        <ProfileClient initialData={profile} token={token} />
      </div>
    </div>
  );
}
