import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-muted/30 hidden md:block">
        <nav className="p-4 space-y-2">
          <h2 className="font-semibold px-2 mb-4 text-sm uppercase text-muted-foreground">Admin Panel</h2>
          <Link href="/admin" className="block px-2 py-1.5 rounded-md hover:bg-muted font-medium text-sm">
            Dashboard
          </Link>
          <Link href="/admin/logs" className="block px-2 py-1.5 rounded-md hover:bg-muted font-medium text-sm">
            Audit Logs
          </Link>
          <Link href="/admin/users" className="block px-2 py-1.5 rounded-md hover:bg-muted font-medium text-sm">
            Users
          </Link>
          <Link href="/admin/sellers" className="block px-2 py-1.5 rounded-md hover:bg-muted font-medium text-sm">
            Sellers
          </Link>
          <Link href="/admin/orders" className="block px-2 py-1.5 rounded-md hover:bg-muted font-medium text-sm">
            Orders
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
