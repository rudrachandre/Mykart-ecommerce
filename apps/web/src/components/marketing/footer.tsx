import Link from 'next/link';
import type { SVGProps } from 'react';
import { Logo } from '@/components/marketing/logo';

/* Brand glyphs (lucide-react dropped brand icons, so inline them here). */
const Instagram = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);
const Twitter = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M22 4.01c-.82.36-1.7.6-2.63.72a4.6 4.6 0 0 0 2-2.54c-.88.52-1.86.9-2.9 1.1a4.58 4.58 0 0 0-7.82 4.18A13 13 0 0 1 2.5 2.98a4.58 4.58 0 0 0 1.42 6.12c-.75-.02-1.47-.23-2.1-.57v.06a4.59 4.59 0 0 0 3.68 4.5c-.3.08-.6.12-.92.12-.23 0-.45-.02-.66-.06a4.58 4.58 0 0 0 4.28 3.18A9.2 9.2 0 0 1 2 19.54a12.98 12.98 0 0 0 7 2.04c8.4 0 13-6.96 13-13v-.59c.9-.65 1.67-1.45 2.24-2.38z" />
  </svg>
);
const Facebook = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);
const Youtube = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
  </svg>
);

/**
 * Figma §23 — warm surface footer: 4-column top row (brand 280px +
 * Shop/Company/Support 160px), hairline divider, legal + payment badges.
 */
const columns = [
  {
    heading: 'Shop',
    links: [
      { label: 'All Products', href: '/products' },
      { label: 'Categories', href: '/categories' },
      { label: 'Brands', href: '/brands' },
      { label: 'Search', href: '/search' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'Become a Seller', href: '/seller/onboard' },
      { label: 'Seller Dashboard', href: '/seller' },
      { label: 'Admin', href: '/admin' },
    ],
  },
  {
    heading: 'Support',
    links: [
      { label: 'My Account', href: '/account' },
      { label: 'My Orders', href: '/orders' },
      { label: 'Wishlist', href: '/wishlist' },
      { label: 'Cart', href: '/cart' },
    ],
  },
];

const socials = [
  { label: 'Instagram', icon: Instagram, href: '#' },
  { label: 'Twitter', icon: Twitter, href: '#' },
  { label: 'Facebook', icon: Facebook, href: '#' },
  { label: 'YouTube', icon: Youtube, href: '#' },
];

const payments = ['VISA', 'MASTERCARD', 'APPLE PAY', 'PAYPAL'];

export function Footer() {
  return (
    <footer className="bg-secondary">
      <div className="mx-auto max-w-[1280px] px-5 md:px-10 xl:px-20 pt-16 md:pt-20 pb-10 md:pb-12">
        <div className="flex flex-col gap-12 md:flex-row md:justify-between">
          {/* Brand */}
          <div className="flex w-full flex-col gap-6 md:w-[280px]">
            <Logo variant="footer" />
            <p className="text-sm leading-relaxed text-muted-foreground">
              Curated everyday essentials from independent makers. Thoughtful
              design, honest materials, delivered with care.
            </p>
            <div className="flex items-center gap-3">
              {socials.map(({ label, icon: Icon }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border bg-background text-foreground transition-colors duration-200 hover:bg-accent hover:text-accent-foreground"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <nav key={col.heading} className="flex w-full flex-col gap-4 md:w-[160px]" aria-label={col.heading}>
              <h3 className="font-display text-[15px] font-bold text-foreground">{col.heading}</h3>
              <ul className="flex flex-col gap-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 h-px w-full bg-border" />

        <div className="mt-8 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="flex flex-wrap items-center gap-6 text-[13px] text-muted-foreground">
            <span>© {new Date().getFullYear()} mykart</span>
            <a href="#" className="transition-colors hover:text-foreground">Privacy Policy</a>
            <a href="#" className="transition-colors hover:text-foreground">Terms of Service</a>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {payments.map((p) => (
              <span
                key={p}
                className="rounded border bg-background px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}