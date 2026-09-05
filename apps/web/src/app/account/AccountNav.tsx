'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, Heart, Star, MapPin, Bell, User, ShieldCheck } from 'lucide-react';
import LogoutButton from './LogoutButton';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: any;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/account', icon: LayoutDashboard, exact: true },
  { label: 'My Orders', href: '/account/orders', icon: Package },
  { label: 'Wishlist', href: '/account/wishlist', icon: Heart },
  { label: 'My Reviews', href: '/account/reviews', icon: Star },
  { label: 'Addresses', href: '/account/addresses', icon: MapPin },
  { label: 'Notifications', href: '/account/notifications', icon: Bell },
  { label: 'Edit Profile', href: '/account/profile', icon: User },
  { label: 'Security', href: '/account/security', icon: ShieldCheck },
];

export function AccountNav() {
  const pathname = usePathname();

  const isLinkActive = (item: NavItem) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  return (
    <>
      {/* Mobile Horizontal Navigation Tab Bar */}
      <div className="md:hidden w-full overflow-x-auto no-scrollbar border-b border-border/40 pb-2 mb-6">
        <div className="flex items-center gap-2 min-w-max px-1">
          {NAV_ITEMS.map((item) => {
            const active = isLinkActive(item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all',
                  active
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-secondary/80 text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:block w-64 flex-shrink-0">
        <div className="sticky top-24">
          <h2 className="text-xl font-extrabold mb-6 tracking-tight">My Account</h2>
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = isLinkActive(item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <div className="my-4 border-t border-border/40" />
            <LogoutButton />
          </nav>
        </div>
      </aside>
    </>
  );
}
