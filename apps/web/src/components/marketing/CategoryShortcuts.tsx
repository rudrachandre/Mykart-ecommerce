'use client';

import Link from 'next/link';
import { Tag, Smartphone, Laptop, Shirt, Home, Sparkles, Trophy, Flame } from 'lucide-react';

const shortcuts = [
  { label: 'Top Deals', href: '/deals', icon: Tag, color: 'text-red-500 bg-red-500/10' },
  { label: 'Mobiles', href: '/products?categorySlug=smartphones', icon: Smartphone, color: 'text-blue-500 bg-blue-500/10' },
  { label: 'Electronics', href: '/products?categorySlug=electronics', icon: Laptop, color: 'text-cyan-500 bg-cyan-500/10' },
  { label: 'Fashion', href: '/products?categorySlug=fashion', icon: Shirt, color: 'text-pink-500 bg-pink-500/10' },
  { label: 'Home & Living', href: '/products?categorySlug=home-kitchen', icon: Home, color: 'text-orange-500 bg-orange-500/10' },
  { label: 'Beauty', href: '/products?categorySlug=beauty-personal-care', icon: Sparkles, color: 'text-purple-500 bg-purple-500/10' },
  { label: 'Sports', href: '/products?categorySlug=sports-fitness', icon: Trophy, color: 'text-green-500 bg-green-500/10' },
  { label: 'New Arrivals', href: '/products?sortBy=NEWEST', icon: Flame, color: 'text-amber-500 bg-amber-500/10' },
];

export function CategoryShortcuts() {
  return (
    <section className="bg-card border-b py-4">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 scrollbar-none justify-start md:justify-center">
          {shortcuts.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.label}
                href={s.href}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-background border hover:border-primary/50 hover:shadow-sm transition-all shrink-0 text-xs font-semibold text-foreground group"
              >
                <div className={`p-1.5 rounded-lg ${s.color} group-hover:scale-110 transition-transform`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span>{s.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
