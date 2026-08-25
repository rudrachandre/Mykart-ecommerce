import { cookies } from 'next/headers';
import { getProfile } from '@/lib/api/users';
import Link from 'next/link';
import { Package, Heart, MapPin, Bell, User } from 'lucide-react';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'My Account | MyKart',
};

export default async function AccountDashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  if (!token) redirect('/login');

  let profile: Awaited<ReturnType<typeof getProfile>>;
  try {
    profile = await getProfile(token);
  } catch {
    // Keep the account shell (and Logout) mounted instead of the Next.js
    // route-level error overlay, which previously hid the only Logout control
    // the RBAC tests click after visiting seller/admin dashboards.
    return (
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight mb-8">Dashboard</h1>
        <p role="alert">Unable to load your account details. Please retry or log out.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight mb-8">Dashboard</h1>
      
      <div className="bg-secondary border border-border/40 p-8 mb-8 flex items-center gap-6">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary border border-primary/20">
          {profile.avatar ? (
            <img src={profile.avatar} alt={profile.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            <span className="text-2xl font-bold">{profile.name?.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div>
          <h2 className="text-xl font-bold">{profile.name}</h2>
          <p className="text-muted-foreground">{profile.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <Link href="/orders" className="bg-background border border-border/40 p-6 flex flex-col items-center justify-center text-center hover:border-primary/50 transition-colors group">
          <div className="w-12 h-12 bg-primary/5 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Package className="w-6 h-6 text-primary" />
          </div>
          <span className="text-3xl font-extrabold">{profile._count?.orders || 0}</span>
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-2">Orders</span>
        </Link>
        <Link href="/wishlist" className="bg-background border border-border/40 p-6 flex flex-col items-center justify-center text-center hover:border-primary/50 transition-colors group">
          <div className="w-12 h-12 bg-primary/5 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Heart className="w-6 h-6 text-primary" />
          </div>
          <span className="text-3xl font-extrabold">{profile._count?.wishlists || 0}</span>
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-2">Wishlist</span>
        </Link>
        <Link href="/account/addresses" className="bg-background border border-border/40 p-6 flex flex-col items-center justify-center text-center hover:border-primary/50 transition-colors group">
          <div className="w-12 h-12 bg-primary/5 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <MapPin className="w-6 h-6 text-primary" />
          </div>
          <span className="text-3xl font-extrabold">{profile.addresses?.length || 0}</span>
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-2">Addresses</span>
        </Link>
        <Link href="/account/notifications" className="bg-background border border-border/40 p-6 flex flex-col items-center justify-center text-center hover:border-primary/50 transition-colors group">
          <div className="w-12 h-12 bg-primary/5 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform relative">
            <Bell className="w-6 h-6 text-primary" />
            {(profile._count?.notifications > 0) && (
              <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-background"></span>
            )}
          </div>
          <span className="text-3xl font-extrabold">{profile._count?.notifications || 0}</span>
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-2">Unread</span>
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold">Default Address</h3>
            <Link href="/account/addresses" className="text-xs font-bold uppercase tracking-widest text-primary hover:underline">Manage</Link>
          </div>
          {profile.addresses?.find((a: any) => a.isDefault) ? (
            <div className="border border-border/40 p-6 bg-secondary text-sm space-y-1">
              <p className="font-bold text-base mb-2">{profile.addresses.find((a: any) => a.isDefault).fullName}</p>
              <p>{profile.addresses.find((a: any) => a.isDefault).addressLine1}</p>
              <p>{profile.addresses.find((a: any) => a.isDefault).city}, {profile.addresses.find((a: any) => a.isDefault).state} {profile.addresses.find((a: any) => a.isDefault).postalCode}</p>
            </div>
          ) : (
            <div className="border border-border/40 border-dashed p-6 text-center text-muted-foreground">
              <p>No default address set.</p>
            </div>
          )}
        </div>
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold">Profile Info</h3>
            <Link href="/account/profile" className="text-xs font-bold uppercase tracking-widest text-primary hover:underline">Edit</Link>
          </div>
          <div className="border border-border/40 p-6 bg-secondary text-sm space-y-4">
            <div>
              <p className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-1">Full Name</p>
              <p className="font-medium">{profile.name}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-1">Email Address</p>
              <p className="font-medium">{profile.email}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
