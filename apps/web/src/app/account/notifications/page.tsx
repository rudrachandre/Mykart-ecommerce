import { cookies } from 'next/headers';
import { getNotifications } from '@/lib/api/notifications';
import { redirect } from 'next/navigation';
import NotificationsClient from './NotificationsClient';

export const metadata = {
  title: 'Notifications | MyKart',
};

export default async function NotificationsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  if (!token) redirect('/login');

  const notifications = await getNotifications(token);

  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight mb-2">Notifications</h1>
      <p className="text-muted-foreground mb-8">Stay updated on your orders and account activity.</p>
      
      <NotificationsClient initialNotifications={notifications} token={token} />
    </div>
  );
}
