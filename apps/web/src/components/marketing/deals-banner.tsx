'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

/** Figma §20 — full-bleed dark (#111) rounded-24 promo banner with coupon highlight. */
export function DealsBanner() {
  return (
    <section className="mx-auto max-w-[1280px] px-5 md:px-10 xl:px-20">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '80px' }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="flex flex-col overflow-hidden rounded-3xl bg-foreground lg:flex-row"
      >
        <div className="flex flex-[1_0_0] flex-col items-start gap-6 p-8 sm:p-12 lg:p-16">
          <span className="text-sm font-bold uppercase tracking-wide text-brand">
            Limited Time Promo
          </span>
          <h2 className="font-display text-3xl font-extrabold leading-tight text-background sm:text-4xl lg:text-[44px]">
            Get 20% off your first modular workspace setup
          </h2>
          <p className="max-w-prose text-base leading-relaxed text-background/80">
            Redesign the way you work. Use code{' '}
            <span className="font-bold text-brand">CREATIVE20</span> at checkout
            and save on your first order — because great ideas deserve a great desk.
          </p>
          <div className="flex flex-wrap items-center gap-5 pt-2">
            <Button asChild size="lg" className="h-12 rounded-lg px-7 font-display text-[15px] font-semibold">
              <Link href="/products">Claim the Offer</Link>
            </Button>
            <Link
              href="/categories"
              className="font-display text-[15px] font-semibold text-background underline-offset-4 hover:underline"
            >
              View Terms &amp; Conditions
            </Link>
          </div>
        </div>
        <div className="relative min-h-[260px] w-full overflow-hidden lg:h-[440px] lg:w-[540px] lg:flex-none">
          <Image
            src="https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?q=80&w=1400&auto=format&fit=crop"
            alt=""
            fill
            sizes="(min-width:1024px) 540px, 100vw"
            className="object-cover"
          />
        </div>
      </motion.div>
    </section>
  );
}