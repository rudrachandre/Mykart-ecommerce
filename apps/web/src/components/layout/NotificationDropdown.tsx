'use client';

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { getNotifications, markAsRead, markAllAsRead } from '@/lib/api/notifications';
import Cookies from 'js-cookie';
import { useAuth } from '@/contexts/AuthContext';

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export function NotificationDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use AuthContext to prevent hydration mismatches
  const { user, loading } = useAuth();
  const token = Cookies.get('accessToken');

  const loadNotifications = async () => {
    try {
      setError(null);
      const data = await getNotifications(token!);
      setNotifications(data);
    } catch (err: any) {
      setError('Failed to load notifications');
      console.warn('Notification API Error:', err.message);
    }
  };

  useEffect(() => {
    if (user && token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadNotifications();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(token!, id);
      setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err: any) {
      console.warn('Failed to mark as read:', err.message);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead(token!);
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch (err: any) {
      console.warn('Failed to mark all as read:', err.message);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // Prevent hydration mismatch by returning skeleton or null during SSR
  if (loading) {
    return <div className="h-9 w-9 animate-pulse bg-muted rounded-full" />;
  }

  if (!user || !token) return null;

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-muted transition-colors focus:outline-none"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && !error && (
          <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-popover border shadow-lg rounded-lg z-50 flex flex-col max-h-[80vh]">
          <div className="p-4 border-b flex justify-between items-center bg-muted/50 rounded-t-lg">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && !error && (
              <button 
                onClick={handleMarkAllAsRead}
                className="text-xs text-primary hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>
          
          <div className="overflow-y-auto flex-1">
            {error ? (
              <div className="p-8 text-center text-red-500 text-sm">
                {error}
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No notifications
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map(notification => (
                  <div 
                    key={notification.id} 
                    className={`p-4 transition-colors ${!notification.read ? 'bg-primary/5' : 'bg-transparent'} hover:bg-muted/50`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm font-medium">{notification.title}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {notification.message}
                    </p>
                    {!notification.read && (
                      <button 
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="text-[10px] text-primary hover:underline font-medium"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
