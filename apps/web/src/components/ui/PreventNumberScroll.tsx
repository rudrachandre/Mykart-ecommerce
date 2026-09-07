'use client';

import { useEffect } from 'react';

export function PreventNumberScroll() {
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const activeElement = document.activeElement as HTMLInputElement | null;
      if (activeElement && activeElement.tagName === 'INPUT' && activeElement.type === 'number') {
        activeElement.blur();
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return null;
}
