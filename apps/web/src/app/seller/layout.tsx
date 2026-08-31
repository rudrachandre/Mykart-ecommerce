import { cookies } from 'next/headers';
import Link from 'next/link';
import { getSellerProfile } from '@/lib/api/sellers';
import { LayoutDashboard, Package, ShoppingCart, BarChart3, Settings, Gift, MessageSquare } from 'lucide-react';

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  if (!token) {
    return <>{children}</>;
  }

  let profile;
  try {
    profile = await getSellerProfile(token);
  } catch (e) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r bg-card text-card-foreground">
        <div className="p-6 border-b">
          <Link href="/seller" className="flex items-center gap-2 font-semibold">
            <span className="text-lg tracking-tight font-bold">MyKart Seller</span>
          </Link>
          <p className="text-xs text-muted-foreground mt-1 truncate">{profile.storeName}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Link href="/seller" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-muted transition-colors">
            <LayoutDashboard className="w-4 h-4" /> Overview
          </Link>
          <Link href="/seller/products" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-muted transition-colors">
            <Package className="w-4 h-4" /> Products
          </Link>
          <Link href="/seller/inventory" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-muted transition-colors">
            <BarChart3 className="w-4 h-4" /> Inventory
          </Link>
          <Link href="/seller/orders" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-muted transition-colors">
            <ShoppingCart className="w-4 h-4" /> Orders
          </Link>
          <Link href="/seller/reviews" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-muted transition-colors">
            <MessageSquare className="w-4 h-4" /> Reviews
          </Link>
          <Link href="/seller/coupons" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-muted transition-colors">
            <Gift className="w-4 h-4" /> Coupons
          </Link>
          <Link href="/seller/settings" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-muted transition-colors">
            <Settings className="w-4 h-4" /> Store Settings
          </Link>
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden border-b bg-card p-4 flex flex-wrap gap-4 items-center justify-between">
          <Link href="/seller" className="font-bold text-sm">MyKart Seller</Link>
          <div className="flex flex-wrap gap-3 text-xs font-medium">
            <Link href="/seller">Dashboard</Link>
            <Link href="/seller/products">Products</Link>
            <Link href="/seller/inventory">Inventory</Link>
            <Link href="/seller/orders">Orders</Link>
            <Link href="/seller/reviews">Reviews</Link>
            <Link href="/seller/coupons">Coupons</Link>
            <Link href="/seller/settings">Settings</Link>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
