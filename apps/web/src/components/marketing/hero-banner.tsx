'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight, ShieldCheck, Star } from 'lucide-react';

const stats = [
  { value: '150k+', label: 'Happy Customers' },
  { value: '4.9 ★', label: 'Average Rating' },
  { value: '24/7', label: 'Customer Support' },
];

export function HeroBanner() {
  return (
    <section className="bg-gradient-to-b from-card to-background border-b py-10 lg:py-14">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Text Content */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="lg:col-span-7 flex flex-col items-start gap-6"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1.5 text-xs font-semibold uppercase text-primary border border-primary/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Spring Collection Drop 2026</span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight text-foreground">
              Elevate your everyday essentials
            </h1>

            <p className="text-base sm:text-lg leading-relaxed text-muted-foreground max-w-2xl">
              Thoughtfully designed pieces from independent makers — built to last, priced to love, and delivered straight to your door with care.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Button asChild size="lg" className="rounded-xl px-8 font-display text-base font-semibold h-13 shadow-md">
                <Link href="/products" className="flex items-center gap-2">
                  Shop Collection <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-13 rounded-xl border-2 border-foreground/20 bg-background px-7 font-display text-base font-semibold text-foreground hover:bg-muted"
              >
                <Link href="/categories">Explore Categories</Link>
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-8 pt-4 border-t w-full">
              {stats.map((s) => (
                <div key={s.label} className="flex flex-col gap-0.5">
                  <span className="font-display text-2xl font-bold text-foreground">{s.value}</span>
                  <span className="text-xs text-muted-foreground font-medium">{s.label}</span>
                </div>
              ))}
              <div className="ml-auto hidden sm:flex items-center gap-2 text-xs text-muted-foreground font-medium bg-muted/50 px-3 py-1.5 rounded-lg border">
                <ShieldCheck className="w-4 h-4 text-green-600" />
                <span>100% Authentic Products</span>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Hero Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
            className="lg:col-span-5 relative w-full h-[380px] sm:h-[480px] rounded-3xl overflow-hidden shadow-xl border bg-secondary"
          >
            <Image
              src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1200&auto=format&fit=crop"
              alt="Featured product collection photography"
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            
            <div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-background/90 backdrop-blur-md border shadow-lg flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-primary uppercase tracking-wider">Featured Item</p>
                <p className="text-sm font-bold text-foreground">Minimalist Smart Tech Watch</p>
              </div>
              <div className="flex items-center gap-1 text-yellow-500 font-bold text-xs bg-yellow-500/10 px-2 py-1 rounded">
                <Star className="w-3.5 h-3.5 fill-current" /> 4.9
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}