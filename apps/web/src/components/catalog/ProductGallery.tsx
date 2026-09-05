'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

export function ProductGallery({ 
  images, 
  productName,
  hasDiscount
}: { 
  images: any[], 
  productName: string,
  hasDiscount: boolean
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const mainImage = images?.[selectedIndex]?.url || '/placeholder.png';

  return (
    <div className="flex flex-col gap-4 w-full">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative w-full aspect-square max-h-[380px] sm:max-h-[460px] lg:max-h-[500px] overflow-hidden bg-secondary/50 rounded-xl border border-border/50 flex items-center justify-center p-4"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedIndex}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="relative w-full h-full flex items-center justify-center"
          >
            <Image
              src={mainImage}
              alt={`${productName} - View ${selectedIndex + 1}`}
              fill
              className="object-contain cursor-zoom-in p-2 transition-transform duration-300 hover:scale-105"
              priority
              sizes="(min-width: 1024px) 45vw, 100vw"
            />
          </motion.div>
        </AnimatePresence>
        
        {hasDiscount && (
          <span className="absolute left-4 top-4 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-md z-10 shadow-sm">
            Sale
          </span>
        )}
      </motion.div>

      {images?.length > 1 && (
        <div className="flex gap-3 overflow-x-auto py-1 hide-scrollbar">
          {images.map((img: any, i: number) => (
            <button
              key={i}
              onClick={() => setSelectedIndex(i)}
              className={`relative aspect-square w-16 sm:w-20 shrink-0 overflow-hidden bg-secondary/30 rounded-lg border transition-all p-1 ${
                selectedIndex === i 
                  ? 'border-primary ring-2 ring-primary/20 opacity-100' 
                  : 'border-border/60 opacity-60 hover:opacity-100'
              }`}
            >
              <Image
                src={img.url}
                alt={`Thumbnail ${i + 1}`}
                fill
                className="object-contain"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
