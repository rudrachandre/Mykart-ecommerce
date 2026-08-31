import Link from 'next/link';
import {
  LayoutDashboard,
  BarChart3,
  Users,
  Store,
  Package,
  FolderOpen,
  Bookmark,
  ShoppingCart,
  CreditCard,
  RefreshCw,
  MessageSquare,
  Gift,
  FileText,
  Settings,
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const sidebarLinks = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/sellers', label: 'Sellers', icon: Store },
    { href: '/admin/products', label: 'Products', icon: Package },
    { href: '/admin/categories', label: 'Categories', icon: FolderOpen },
    { href: '/admin/brands', label: 'Brands', icon: Bookmark },
    { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
    { href: '/admin/payments', label: 'Payments', icon: CreditCard },
    { href: '/admin/refunds', label: 'Refunds', icon: RefreshCw },
    { href: '/admin/reviews', label: 'Reviews', icon: MessageSquare },
    { href: '/admin/coupons', label: 'Coupons', icon: Gift },
    { href: '/admin/logs', label: 'Audit Logs', icon: FileText },
    { href: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex flex-col w-64 border-r bg-card text-card-foreground">
        <div className="p-6 border-b">
          <Link href="/admin" className="flex items-center gap-2 font-bold text-lg">
            <span>MyKart Admin</span>
          </Link>
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-1">
            Central Console
          </p>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {sidebarLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-muted transition-colors text-foreground/80 hover:text-foreground"
              >
                <Icon className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header and Nav */}
        <header className="lg:hidden border-b bg-card p-4 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <Link href="/admin" className="font-bold text-sm">MyKart Admin</Link>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold overflow-x-auto pb-2">
            {sidebarLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-2 py-1 bg-muted hover:bg-accent rounded-md flex-shrink-0"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
