'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart, Truck, Sparkles, HelpCircle, Store } from 'lucide-react';
import { SearchBar } from '../search/SearchBar';
import { NotificationDropdown } from './NotificationDropdown';
import { UserDropdown } from './UserDropdown';
import { CartDrawer } from '../cart/CartDrawer';
import { MobileMenu } from './mobile-menu';
import { CategoryDrawer } from './CategoryDrawer';
import { Logo } from '@/components/marketing/logo';

export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full bg-background transition-shadow duration-200 ${
        scrolled ? 'shadow-md border-b' : 'border-b'
      }`}
    >
      {/* 1. TOP UTILITY BAR */}
      <div className="bg-muted/60 border-b text-xs text-muted-foreground font-medium py-1.5 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1600px] justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> New
            </span>
            <span className="font-semibold text-foreground hidden sm:inline">Spring Collection 2026</span>
            <span className="text-muted-foreground hidden md:inline">— Explore curated everyday essentials</span>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 ml-auto">
            <Link href="/account" className="hover:text-primary transition-colors flex items-center gap-1">
              <Truck className="w-3.5 h-3.5" /> Track Order
            </Link>
            <Link href="/products" className="hover:text-primary transition-colors flex items-center gap-1 hidden sm:flex">
              <HelpCircle className="w-3.5 h-3.5" /> Help & Support
            </Link>
            <Link href="/seller/onboard" className="hover:text-primary transition-colors flex items-center gap-1 font-semibold text-primary">
              <Store className="w-3.5 h-3.5" /> Sell on MyKart
            </Link>
          </div>
        </div>
      </div>

      {/* 2. MAIN HEADER */}
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 sm:gap-4 px-4 sm:px-6 lg:px-8">
        {/* Left: Category Drawer & Logo */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <CategoryDrawer />
          <Logo />
        </div>

        {/* Center: Search bar */}
        <div className="hidden min-w-0 flex-1 justify-center md:flex px-4 max-w-2xl mx-auto">
          <div className="w-full">
            <SearchBar />
          </div>
        </div>

        {/* Right: Primary nav links & Action Icons */}
        <div className="ml-auto flex shrink-0 items-center gap-3 sm:gap-4">
          <nav aria-label="Primary" className="hidden items-center gap-5 lg:flex">
            <Link href="/deals" className="text-sm font-bold text-red-500 hover:text-red-600 transition-colors">
              Deals
            </Link>
            <Link href="/products" className="text-sm font-semibold text-foreground hover:text-primary transition-colors">
              Products
            </Link>
            <Link href="/categories" className="text-sm font-semibold text-foreground hover:text-primary transition-colors">
              Categories
            </Link>
            <Link href="/brands" className="text-sm font-semibold text-foreground hover:text-primary transition-colors">
              Brands
            </Link>
          </nav>

          <span aria-hidden="true" className="hidden h-5 w-px bg-border lg:block" />

          <UserDropdown />
          <NotificationDropdown />
          <WishlistLink />
          <CartDrawer />
          <MobileMenu />
        </div>
      </div>

      {/* Mobile search row */}
      <div className="border-t px-4 py-2.5 md:hidden bg-background">
        <SearchBar />
      </div>

    </header>
  );
}

function WishlistLink() {
  return (
    <Link
      href="/wishlist"
      aria-label="Wishlist"
      className="hidden rounded-lg p-2 text-foreground transition-colors duration-200 hover:bg-secondary hover:text-primary sm:flex"
    >
      <Heart className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
    </Link>
  );
}
