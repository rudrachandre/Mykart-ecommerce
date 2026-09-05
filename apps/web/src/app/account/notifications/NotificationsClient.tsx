'use client';

import { useState } from 'react';
import { markAsRead, markAllAsRead } from '@/lib/api/notifications';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Check, BellRing, CheckCheck, Loader2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

type Notification = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
};

interface NotificationsClientProps {
  initialNotifications: Notification[];
  token: string;
}

export default function NotificationsClient({ initialNotifications, token }: NotificationsClientProps) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const router = useRouter();

  const handleMarkRead = async (id: string) => {
    if (loadingId) return;
    setLoadingId(id);

    try {
      await markAsRead(token, id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      toast.success('Marked as read');
      router.refresh();
    } catch (e: any) {
      toast.error('Failed to update notification');
    } finally {
      setLoadingId(null);
    }
  };

  const handleMarkAllRead = async () => {
    if (isMarkingAll) return;
    setIsMarkingAll(true);

    try {
      await markAllAsRead(token);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
      router.refresh();
    } catch (e: any) {
      toast.error('Failed to update notifications');
    } finally {
      setIsMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const readCount = notifications.filter((n) => n.read).length;

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    if (filter === 'read') return n.read;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Filter Tabs & Bulk Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div className="flex items-center gap-1.5 bg-secondary/80 p-1 rounded-lg">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
              filter === 'all'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
            aria-label="Filter all notifications"
          >
            All <span className="ml-1 opacity-70">({notifications.length})</span>
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
              filter === 'unread'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
            aria-label="Filter unread notifications"
          >
            Unread <span className="ml-1 opacity-70">({unreadCount})</span>
          </button>
          <button
            onClick={() => setFilter('read')}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
              filter === 'read'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
            aria-label="Filter read notifications"
          >
            Read <span className="ml-1 opacity-70">({readCount})</span>
          </button>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={isMarkingAll}
            className="uppercase tracking-wider text-xs font-bold h-9"
          >
            {isMarkingAll ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Marking...
              </>
            ) : (
              <>
                <CheckCheck className="w-3.5 h-3.5 mr-2 text-primary" /> Mark all as read
              </>
            )}
          </Button>
        )}
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border/60 rounded-xl bg-card p-8">
          <BellRing className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-foreground mb-1">
            {filter === 'unread'
              ? 'No unread notifications'
              : filter === 'read'
              ? 'No read notifications'
              : 'No notifications yet'}
          </h2>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            {filter === 'unread'
              ? 'You are all caught up! Check the All tab to review past activity.'
              : 'Notifications about your order updates, delivery status, and security alerts will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredNotifications.map((notif) => {
              const isLoading = loadingId === notif.id;

              return (
                <motion.div
                  key={notif.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={cn(
                    'p-5 rounded-xl border transition-all flex justify-between gap-4 items-start shadow-sm',
                    notif.read
                      ? 'bg-card border-border/40 text-muted-foreground'
                      : 'bg-primary/5 border-primary/20 text-foreground ring-1 ring-primary/10'
                  )}
                >
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      {!notif.read && (
                        <span className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0 animate-pulse" />
                      )}
                      <h3
                        className={cn(
                          'font-bold text-sm tracking-tight',
                          !notif.read ? 'text-foreground' : 'text-foreground/80'
                        )}
                      >
                        {notif.title}
                      </h3>
                    </div>
                    <p className={cn('text-sm leading-relaxed', !notif.read ? 'text-foreground/90' : 'text-muted-foreground')}>
                      {notif.message}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground pt-1">
                      {new Date(notif.createdAt).toLocaleString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  {!notif.read && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleMarkRead(notif.id)}
                      disabled={isLoading}
                      className="text-primary hover:bg-primary/10 hover:text-primary rounded-full flex-shrink-0"
                      title="Mark as read"
                      aria-label={`Mark "${notif.title}" as read`}
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
