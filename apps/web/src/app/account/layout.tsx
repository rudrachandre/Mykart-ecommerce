import { ReactNode } from 'react';
import Link from 'next/link';
import { User, MapPin, Bell, Key, Package, Heart } from 'lucide-react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import LogoutButton from './LogoutButton';

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  if (!token) {
    redirect('/login');
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl">
      <div className="flex flex-col md:flex-row gap-12">
        {/* Sidebar */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <div className="sticky top-24">
            <h2 className="text-xl font-extrabold mb-6 tracking-tight">My Account</h2>
            <nav className="space-y-1">
              <Link href="/account" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted text-sm font-medium transition-colors">
                <User className="w-4 h-4" /> Dashboard
              </Link>
              <Link href="/account/profile" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted text-sm font-medium transition-colors">
                <User className="w-4 h-4" /> Edit Profile
              </Link>
              <Link href="/account/password" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted text-sm font-medium transition-colors">
                <Key className="w-4 h-4" /> Change Password
              </Link>
              <Link href="/account/addresses" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted text-sm font-medium transition-colors">
                <MapPin className="w-4 h-4" /> Saved Addresses
              </Link>
              <Link href="/account/notifications" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted text-sm font-medium transition-colors">
                <Bell className="w-4 h-4" /> Notifications
              </Link>
              <div className="my-4 border-t border-border/40"></div>
              <Link href="/orders" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted text-sm font-medium transition-colors">
                <Package className="w-4 h-4" /> My Orders
              </Link>
              <Link href="/wishlist" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted text-sm font-medium transition-colors">
                <Heart className="w-4 h-4" /> Wishlist
              </Link>
              <div className="my-4 border-t border-border/40"></div>
              <LogoutButton />
            </nav>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
