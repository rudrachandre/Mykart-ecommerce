'use client';
import { useState } from 'react';
import { markAsRead, markAllAsRead } from '@/lib/api/notifications';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Check, BellRing } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function NotificationsClient({ initialNotifications, token }: { initialNotifications: any[], token: string }) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const router = useRouter();

  const handleMarkRead = async (id: string) => {
    try {
      await markAsRead(token, id);
      setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
      router.refresh();
    } catch (e: any) {
      toast.error('Failed to update notification');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead(token);
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      router.refresh();
      toast.success('All notifications marked as read');
    } catch (e: any) {
      toast.error('Failed to update notifications');
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <p className="font-medium text-muted-foreground">You have {unreadCount} unread messages.</p>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={handleMarkAllRead} className="uppercase tracking-widest text-[10px] font-bold h-8">
            Mark all as read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16 border border-border/40 border-dashed bg-muted/20">
          <BellRing className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground text-lg">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map(notif => (
            <div 
              key={notif.id} 
              className={`p-6 border ${notif.read ? 'bg-card border-border/40' : 'bg-primary/5 border-primary/20'} transition-colors flex justify-between gap-6`}
            >
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {!notif.read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0"></span>}
                  <h3 className={`font-bold ${!notif.read ? 'text-foreground' : 'text-foreground/80'}`}>{notif.title}</h3>
                </div>
                <p className={`${!notif.read ? 'text-foreground/90' : 'text-muted-foreground'} text-sm mb-3`}>{notif.message}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {new Date(notif.createdAt).toLocaleString()}
                </p>
              </div>
              {!notif.read && (
                <button 
                  onClick={() => handleMarkRead(notif.id)}
                  className="text-primary hover:bg-primary/10 p-2 rounded-full transition-colors self-start flex-shrink-0"
                  title="Mark as read"
                >
                  <Check className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
