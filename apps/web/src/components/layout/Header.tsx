'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { SearchBar } from '../search/SearchBar';
import { NotificationDropdown } from './NotificationDropdown';
import { UserDropdown } from './UserDropdown';
import { CartDrawer } from '../cart/CartDrawer';
import { MobileMenu } from './mobile-menu';
import { CategoryDrawer } from './CategoryDrawer';
import { Logo } from '@/components/marketing/logo';

/**
 * Figma §8 TopNavBar — 3-zone layout (logo / pill search / actions) on a
 * white sticky bar with hairline bottom border. All interactive children
 * (SearchBar, account menu, notifications, wishlist, cart) keep their
 * existing logic untouched.
 */
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
        scrolled ? 'shadow-[0_1px_0_0_var(--border)]' : ''
      }`}
    >
      {/* Hairline bottom border — Figma inset pattern */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-border" />

      <div className="mx-auto flex h-[72px] max-w-[1280px] items-center gap-3 sm:gap-4 px-4 sm:px-6 md:gap-6 lg:px-8 xl:px-20">
        {/* Zone 1 — logo & category drawer */}
        <div className="flex items-center gap-2 sm:gap-3">
          <CategoryDrawer />
          <Logo />
        </div>

        {/* Zone 2 — search (center, pill) */}
        <div className="hidden min-w-0 flex-1 justify-center md:flex">
          <div className="w-full max-w-[440px]">
            <SearchBar />
          </div>
        </div>

        {/* Zone 3 — actions */}
        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-4 md:gap-5">
          <nav aria-label="Primary" className="hidden items-center gap-5 lg:flex">
            <Link href="/deals" className="font-display text-sm font-bold text-red-500 hover:text-red-600 transition-colors">Deals</Link>
            <Link href="/products" className="font-display text-sm font-semibold text-foreground transition-colors hover:text-brand">Products</Link>
            <Link href="/categories" className="font-display text-sm font-semibold text-foreground transition-colors hover:text-brand">Categories</Link>
            <Link href="/brands" className="font-display text-sm font-semibold text-foreground transition-colors hover:text-brand">Brands</Link>
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
      <div className="border-t px-5 py-3 md:hidden">
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
      className="hidden rounded-lg p-2 text-foreground transition-colors duration-200 hover:bg-secondary hover:text-brand sm:flex"
    >
      <Heart className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
    </Link>
  );
}
