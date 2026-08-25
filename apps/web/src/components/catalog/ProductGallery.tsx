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
    <div className="flex flex-col gap-6 lg:col-span-7">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative aspect-[4/5] w-full overflow-hidden bg-secondary rounded-md"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedIndex}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full h-full"
          >
            <Image
              src={mainImage}
              alt={`${productName} - View ${selectedIndex + 1}`}
              fill
              className="object-cover cursor-zoom-in"
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
          </motion.div>
        </AnimatePresence>
        
        {hasDiscount && (
          <span className="absolute left-6 top-6 bg-foreground text-background text-xs font-bold uppercase tracking-widest px-4 py-1.5 z-10 shadow-sm">
            Sale
          </span>
        )}
      </motion.div>

      {images?.length > 1 && (
        <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
          {images.map((img: any, i: number) => (
            <button
              key={i}
              onClick={() => setSelectedIndex(i)}
              className={`relative aspect-square w-24 shrink-0 overflow-hidden bg-secondary rounded-md transition-all ${
                selectedIndex === i 
                  ? 'ring-2 ring-foreground ring-offset-2' 
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              <Image
                src={img.url}
                alt={`Thumbnail ${i + 1}`}
                fill
                className="object-cover"
                sizes="96px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
