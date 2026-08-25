'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/** Figma §22 — centered 640px capture block: heading, sub, input+Subscribe. */
export function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address.');
      return;
    }
    // Presentational capture only — no marketing backend exists yet.
    setDone(true);
    toast.success('You are on the list! Welcome to the mykart circular.');
  };

  return (
    <section className="border-y bg-background">
      <div className="mx-auto max-w-[1280px] px-5 md:px-10 xl:px-20 py-16 md:py-24">
        <div className="mx-auto flex w-full max-w-[640px] flex-col items-center gap-8 text-center">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            Join the mykart circular
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            Early drops, honest restock notes and member-only offers — one
            thoughtful email a month, never spam.
          </p>
          <form onSubmit={submit} className="flex w-full flex-col gap-3 sm:flex-row" noValidate>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              aria-label="Email address"
              className="h-[52px] flex-[1_0_42px] rounded-lg border-input bg-secondary px-5 text-sm"
            />
            <Button
              type="submit"
              disabled={done}
              className="h-[52px] rounded-lg px-7 font-display text-[15px] font-semibold"
            >
              {done ? 'Subscribed ✓' : 'Subscribe'}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}