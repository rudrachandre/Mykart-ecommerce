import { cookies } from 'next/headers';
import { getSellerDashboard } from '@/lib/api/sellers';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';
import { Package, ShoppingCart, Store, ArrowRight, BarChart3, TrendingUp, AlertTriangle } from 'lucide-react';
import * as motion from 'framer-motion/client';

export const metadata = {
  title: 'Seller Dashboard | MyKart',
};

export default async function SellerDashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  if (!token) {
    redirect('/login');
  }

  let dashboard;
  try {
    dashboard = await getSellerDashboard(token);
  } catch (error) {
    redirect('/seller/onboard');
  }

  const { profile, revenue, sales, recentOrders, recentProducts, inventoryAlerts } = dashboard;

  return (
    <div className="container mx-auto px-4 py-16 max-w-6xl min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-16 gap-6">
        <div>
          <h1 className="text-4xl lg:text-5xl font-medium tracking-tight text-foreground">Seller Dashboard</h1>
          <p className="text-foreground/60 mt-3 font-light">
            Welcome back to <span className="font-medium text-foreground">{profile.storeName}</span> — your store management center.
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <Link href="/seller/products">
            <Button variant="outline" className="rounded-none h-12 px-6 shadow-none border-foreground text-foreground uppercase tracking-widest text-xs font-bold hover:bg-foreground hover:text-background transition-colors">
              <Package className="mr-2 w-4 h-4" /> Manage Products
            </Button>
          </Link>
          <Link href="/seller/orders">
            <Button variant="outline" className="rounded-none h-12 px-6 shadow-none border-foreground text-foreground uppercase tracking-widest text-xs font-bold hover:bg-foreground hover:text-background transition-colors">
              <ShoppingCart className="mr-2 w-4 h-4" /> Manage Orders
            </Button>
          </Link>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="bg-secondary p-8 relative overflow-hidden group">
          <TrendingUp className="absolute top-0 right-0 p-8 w-32 h-32 text-foreground opacity-5 group-hover:scale-110 transition-all duration-700" />
          <h2 className="text-[10px] font-bold text-foreground/50 uppercase tracking-widest mb-2 relative z-10">Total Revenue</h2>
          <p className="text-4xl font-medium text-foreground relative z-10">₹{revenue.toLocaleString()}</p>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="bg-secondary p-8 relative overflow-hidden group">
          <BarChart3 className="absolute top-0 right-0 p-8 w-32 h-32 text-foreground opacity-5 group-hover:scale-110 transition-all duration-700" />
          <h2 className="text-[10px] font-bold text-foreground/50 uppercase tracking-widest mb-2 relative z-10">Items Sold</h2>
          <p className="text-4xl font-medium text-foreground relative z-10">{sales}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="bg-secondary p-8 relative overflow-hidden group">
          <ShoppingCart className="absolute top-0 right-0 p-8 w-32 h-32 text-foreground opacity-5 group-hover:scale-110 transition-all duration-700" />
          <h2 className="text-[10px] font-bold text-foreground/50 uppercase tracking-widest mb-2 relative z-10">Total Orders</h2>
          <p className="text-4xl font-medium text-foreground relative z-10">{profile._count.orderItems}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="bg-secondary p-8 relative overflow-hidden group">
          <Package className="absolute top-0 right-0 p-8 w-32 h-32 text-foreground opacity-5 group-hover:scale-110 transition-all duration-700" />
          <h2 className="text-[10px] font-bold text-foreground/50 uppercase tracking-widest mb-2 relative z-10">Total Products</h2>
          <p className="text-4xl font-medium text-foreground relative z-10">{profile._count.products}</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="col-span-2 space-y-12">
          <section>
            <div className="flex justify-between items-end mb-6">
              <h3 className="text-2xl font-medium">Recent Orders</h3>
              <Link href="/seller/orders" className="text-sm text-foreground/60 hover:text-foreground font-medium flex items-center">
                View All <ArrowRight className="ml-1 w-4 h-4" />
              </Link>
            </div>
            {recentOrders.length === 0 ? (
              <p className="text-foreground/50 bg-secondary p-6 text-sm">No recent orders found.</p>
            ) : (
              <div className="overflow-x-auto border border-border/40">
                <table className="w-full text-left text-sm">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="p-4 font-medium text-foreground/70">Order ID</th>
                      <th className="p-4 font-medium text-foreground/70">Product</th>
                      <th className="p-4 font-medium text-foreground/70">Customer</th>
                      <th className="p-4 font-medium text-foreground/70">Date</th>
                      <th className="p-4 font-medium text-foreground/70">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {recentOrders.map((item: any) => (
                      <tr key={item.id} className="hover:bg-[#f9f9f9]">
                        <td className="p-4 font-mono text-xs">{item.order.id.slice(-8)}</td>
                        <td className="p-4 font-medium truncate max-w-[200px]">{item.product.name}</td>
                        <td className="p-4">{item.order.user?.name || 'Guest'}</td>
                        <td className="p-4">{new Date(item.order.createdAt).toLocaleDateString()}</td>
                        <td className="p-4">
                          <span className="bg-foreground text-background px-2 py-1 text-[10px] uppercase font-bold tracking-widest">
                            {item.order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <div className="flex justify-between items-end mb-6">
              <h3 className="text-2xl font-medium">Recent Products</h3>
              <Link href="/seller/products" className="text-sm text-foreground/60 hover:text-foreground font-medium flex items-center">
                View All <ArrowRight className="ml-1 w-4 h-4" />
              </Link>
            </div>
            {recentProducts.length === 0 ? (
              <p className="text-foreground/50 bg-secondary p-6 text-sm">No recent products found.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {recentProducts.map((p: any) => (
                  <div key={p.id} className="border border-border/40 p-4 hover:shadow-lg transition-shadow bg-card">
                    <p className="text-xs text-foreground/50 mb-1">{p.status}</p>
                    <p className="font-medium truncate mb-2">{p.name}</p>
                    <p className="text-lg mb-4">₹{parseFloat(p.basePrice).toFixed(2)}</p>
                    <Link href={`/seller/products/${p.slug}/edit`}>
                      <Button variant="outline" className="w-full text-xs h-8">Edit Product</Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div>
          <section className="bg-[#fdf8f8] border border-red-100 p-6">
            <h3 className="text-xl font-medium text-red-900 mb-6 flex items-center">
              <AlertTriangle className="mr-2 w-5 h-5 text-red-500" />
              Inventory Alerts
            </h3>
            {inventoryAlerts.length === 0 ? (
              <p className="text-red-800/60 text-sm">All products have sufficient stock.</p>
            ) : (
              <div className="space-y-4">
                {inventoryAlerts.map((alert: any) => (
                  <div key={alert.id} className="flex justify-between items-start border-b border-red-200/50 pb-4 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium text-red-900 text-sm">{alert.product.name}</p>
                      <p className="text-xs text-red-700/70 mt-1">SKU: {alert.sku}</p>
                    </div>
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-1">
                      {alert.inventory?.quantity || 0} left
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
