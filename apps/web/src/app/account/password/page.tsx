import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ChangePasswordClient from './ChangePasswordClient';

export const metadata = {
  title: 'Change Password | MyKart',
};

export default async function PasswordPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  if (!token) redirect('/login');

  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight mb-2">Change Password</h1>
      <p className="text-muted-foreground mb-8">Ensure your account is using a long, random password to stay secure.</p>
      
      <div className="max-w-xl bg-card border border-border/40 p-8">
        <ChangePasswordClient token={token} />
      </div>
    </div>
  );
}
