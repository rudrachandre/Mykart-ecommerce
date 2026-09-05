import { cookies } from 'next/headers';
import { getNotifications } from '@/lib/api/notifications';
import { redirect } from 'next/navigation';
import NotificationsClient from './NotificationsClient';

export const metadata = {
  title: 'Notifications | MyKart',
  description: 'Stay updated on your orders and account activity.',
};

export default async function NotificationsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  if (!token) redirect('/login');

  let notifications: any[] = [];
  try {
    notifications = await getNotifications(token);
  } catch (err) {
    console.error('Failed to fetch notifications:', err);
  }

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-border/40">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-1">Notifications</h1>
        <p className="text-muted-foreground text-sm">Stay updated on your orders, delivery status, and account activity.</p>
      </div>

      <NotificationsClient initialNotifications={notifications} token={token} />
    </div>
  );
}
