'use client';

import { motion } from 'framer-motion';
import { StarRating } from '@/components/marketing/star-rating';

type Testimonial = { quote: string; name: string; role: string };

const items: Testimonial[] = [
  {
    quote:
      '“Every piece feels considered — the kind of shop you bookmark and actually come back to. Delivery was faster than promised.”',
    name: 'Ananya Sharma',
    role: 'Product Designer, Bengaluru',
  },
  {
    quote:
      '“The quality-to-price ratio is unmatched. My desk setup gets compliments on every video call, and support answered in minutes.”',
    name: 'Rohan Mehta',
    role: 'Software Engineer, Pune',
  },
  {
    quote:
      '“Beautiful packaging, honest materials, zero regrets. mykart is now my default gift recommendation for everyone.”',
    name: 'Sara Iyer',
    role: 'Architect, Mumbai',
  },
];

/** Figma §21 — centered header + 3-col bordered cards (stars, quote, author). */
export function TestimonialsSection() {
  return (
    <section className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-14 md:py-20">
      <div className="flex flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-1 text-center">
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-[32px]">
            Loved by makers everywhere
          </h2>
          <p className="text-base text-muted-foreground">
            Real reviews from the mykart community
          </p>
        </div>
        <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-3">
          {items.map((t, i) => (
            <motion.figure
              key={t.name}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '80px' }}
              transition={{ duration: 0.3, delay: i * 0.06, ease: 'easeOut' }}
              className="flex h-full flex-col justify-between rounded-2xl border bg-card p-8"
            >
              <div className="flex flex-col gap-4">
                <StarRating value={5} />
                <blockquote className="text-base leading-relaxed text-muted-foreground">
                  {t.quote}
                </blockquote>
              </div>
              <figcaption className="flex items-center gap-3 pt-6">
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-sm font-semibold text-foreground"
                >
                  {t.name.split(' ').map((w) => w[0]).join('')}
                </span>
                <span className="flex flex-col">
                  <span className="font-display text-[15px] font-semibold text-foreground">{t.name}</span>
                  <span className="text-[13px] text-muted-foreground">{t.role}</span>
                </span>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}