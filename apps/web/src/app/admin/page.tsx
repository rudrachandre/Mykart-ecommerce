'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { getDashboardStats } from '@/lib/api/analytics';
import { Users, Package, ShoppingCart, DollarSign, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchStats = async () => {
      const token = Cookies.get('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const data = await getDashboardStats(token);
        setStats(data);
      } catch (err: any) {
        setError('Failed to load dashboard stats. Make sure you are an admin.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground font-medium animate-pulse">Loading dashboard...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-2xl p-8 max-w-md text-center">
          <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="py-12 max-w-6xl mx-auto">
      <div className="mb-16">
        <h1 className="text-4xl lg:text-5xl font-medium tracking-tight text-foreground">Platform Overview</h1>
        <p className="text-foreground/60 mt-3 font-light">High-level metrics and system status.</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/admin/users" className="block focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="bg-secondary p-8 relative overflow-hidden group hover:bg-accent transition-colors h-full cursor-pointer rounded-lg"
          >
            <div className="absolute -right-4 -top-4 w-32 h-32 bg-foreground/5 rounded-full group-hover:scale-150 transition-transform duration-700" />
            <div className="flex justify-between items-start mb-8 relative z-10">
              <div className="w-12 h-12 bg-background border border-border/40 flex items-center justify-center">
                <Users className="w-5 h-5 text-foreground" />
              </div>
            </div>
            <div className="relative z-10">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-foreground/50 mb-2">Total Users</h3>
              <p className="text-4xl font-medium text-foreground">{stats?.totalUsers || 0}</p>
            </div>
          </motion.div>
        </Link>
        
        <Link href="/admin/products" className="block focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
              className="group relative h-full cursor-pointer overflow-hidden rounded-2xl border bg-secondary p-8 transition-colors duration-200 hover:bg-accent"
            >
            <div className="absolute -right-4 -top-4 w-32 h-32 bg-foreground/5 rounded-full group-hover:scale-150 transition-transform duration-700" />
            <div className="flex justify-between items-start mb-8 relative z-10">
              <div className="w-12 h-12 bg-background border border-border/40 flex items-center justify-center">
                <Package className="w-5 h-5 text-foreground" />
              </div>
            </div>
            <div className="relative z-10">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-foreground/50 mb-2">Total Products</h3>
              <p className="text-4xl font-medium text-foreground">{stats?.totalProducts || 0}</p>
            </div>
          </motion.div>
        </Link>
        
        <Link href="/admin/orders" className="block focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="bg-secondary p-8 relative overflow-hidden group hover:bg-accent transition-colors h-full cursor-pointer rounded-lg"
          >
            <div className="absolute -right-4 -top-4 w-32 h-32 bg-foreground/5 rounded-full group-hover:scale-150 transition-transform duration-700" />
            <div className="flex justify-between items-start mb-8 relative z-10">
              <div className="w-12 h-12 bg-background border border-border/40 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-foreground" />
              </div>
            </div>
            <div className="relative z-10">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-foreground/50 mb-2">Total Orders</h3>
              <p className="text-4xl font-medium text-foreground">{stats?.totalOrders || 0}</p>
            </div>
          </motion.div>
        </Link>
        
        <Link href="/admin/analytics" className="block focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
            className="bg-secondary p-8 relative overflow-hidden group hover:bg-accent transition-colors h-full cursor-pointer rounded-lg"
          >
            <div className="absolute -right-4 -top-4 w-32 h-32 bg-foreground/5 rounded-full group-hover:scale-150 transition-transform duration-700" />
            <div className="flex justify-between items-start mb-8 relative z-10">
              <div className="w-12 h-12 bg-background border border-border/40 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-foreground" />
              </div>
            </div>
            <div className="relative z-10">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-foreground/50 mb-2">Total Revenue</h3>
              <p className="text-4xl font-medium text-foreground">₹{(stats?.totalRevenue || 0).toFixed(2)}</p>
            </div>
          </motion.div>
        </Link>
      </div>
    </div>
  );
}
