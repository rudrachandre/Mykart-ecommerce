'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

/**
 * Figma §12 — 2-col hero: promo pill, 60px ExtraBold heading, Geist body,
 * primary+secondary buttons, stats row; right 520px rounded-24 image.
 */
const stats = [
  { value: '150k+', label: 'Happy Customers' },
  { value: '4.9/5', label: 'Average Rating' },
  { value: '24/7', label: 'Expert Support' },
];

export function HeroBanner() {
  return (
    <section className="mx-auto max-w-[1280px] px-5 md:px-10 xl:px-20 py-14 md:py-20">
      <div className="flex flex-col items-center gap-10 lg:flex-row lg:gap-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="flex w-full flex-col items-start gap-6 lg:flex-[1_0_0]"
        >
          <span className="inline-flex items-center rounded-full bg-accent px-3 py-1.5 text-xs font-semibold uppercase text-accent-foreground">
            ⚡ Spring Collection Drop
          </span>
          <h1 className="font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-5xl xl:text-[60px]">
            Elevate your everyday essentials
          </h1>
          <p className="max-w-prose text-lg leading-relaxed text-muted-foreground">
            Thoughtfully designed pieces from independent makers — built to
            last, priced to love, delivered with care.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Button asChild size="lg" className="rounded-lg px-7 font-display text-[15px] font-semibold h-12">
              <Link href="/products">Shop Collection</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 rounded-lg border-[1.5px] border-foreground bg-transparent px-6 font-display text-[15px] font-semibold text-foreground hover:bg-foreground hover:text-background"
            >
              <Link href="/categories">Learn More</Link>
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-8 pt-4">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col gap-0.5">
                <span className="font-display text-2xl font-bold text-foreground">{s.value}</span>
                <span className="text-[13px] text-muted-foreground">{s.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
          className="relative aspect-square w-full max-w-[520px] overflow-hidden rounded-3xl bg-secondary lg:w-[520px] lg:flex-none"
        >
          <Image
            src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1200&auto=format&fit=crop"
            alt="Featured product photography on a warm neutral backdrop"
            fill
            priority
            sizes="(min-width: 1024px) 520px, 100vw"
            className="object-cover"
          />
        </motion.div>
      </div>
    </section>
  );
}