'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface DualRangeSliderProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  step?: number;
  formatLabel?: (v: number) => string;
  className?: string;
  debounceMs?: number;
}

export function DualRangeSlider({
  min,
  max,
  value,
  onChange,
  step = 1,
  formatLabel,
  className,
  debounceMs = 300,
}: DualRangeSliderProps) {
  const [localMin, setLocalMin] = useState(value[0]);
  const [localMax, setLocalMax] = useState(value[1]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalMin(value[0]);
    setLocalMax(value[1]);
  }, [value[0], value[1]]);

  const emitChange = useCallback(
    (newMin: number, newMax: number) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onChange([newMin, newMax]);
      }, debounceMs);
    },
    [onChange, debounceMs],
  );

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = Number(e.target.value);
    const clamped = Math.min(raw, localMax - step);
    setLocalMin(clamped);
    emitChange(clamped, localMax);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = Number(e.target.value);
    const clamped = Math.max(raw, localMin + step);
    setLocalMax(clamped);
    emitChange(localMin, clamped);
  };

  const range = max - min;
  const leftPct = range > 0 ? ((localMin - min) / range) * 100 : 0;
  const rightPct = range > 0 ? ((max - localMax) / range) * 100 : 0;

  const fmt = formatLabel ?? ((v: number) => String(v));

  return (
    <div className={cn('w-full select-none', className)}>
      <div className="flex justify-between mb-2 text-xs font-medium text-foreground">
        <span>{fmt(localMin)}</span>
        <span>{fmt(localMax)}</span>
      </div>

      <div className="relative h-5 flex items-center">
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-muted" />
        <div
          className="absolute h-1.5 rounded-full bg-primary"
          style={{ left: `${leftPct}%`, right: `${rightPct}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localMin}
          onChange={handleMinChange}
          className="absolute inset-x-0 w-full h-1.5 appearance-none bg-transparent cursor-pointer pointer-events-auto
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-primary
            [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:border-background
            [&::-webkit-slider-thumb]:shadow-sm
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-moz-range-thumb]:w-4
            [&::-moz-range-thumb]:h-4
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-primary
            [&::-moz-range-thumb]:border-2
            [&::-moz-range-thumb]:border-background
            [&::-moz-range-thumb]:cursor-pointer"
          aria-label="Minimum value"
          aria-valuenow={localMin}
          aria-valuemin={min}
          aria-valuemax={localMax}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localMax}
          onChange={handleMaxChange}
          className="absolute inset-x-0 w-full h-1.5 appearance-none bg-transparent cursor-pointer pointer-events-auto
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-primary
            [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:border-background
            [&::-webkit-slider-thumb]:shadow-sm
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-moz-range-thumb]:w-4
            [&::-moz-range-thumb]:h-4
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-primary
            [&::-moz-range-thumb]:border-2
            [&::-moz-range-thumb]:border-background
            [&::-moz-range-thumb]:cursor-pointer"
          aria-label="Maximum value"
          aria-valuenow={localMax}
          aria-valuemin={localMin}
          aria-valuemax={max}
        />
      </div>

      <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
        <span>{fmt(min)}</span>
        <span>{fmt(max)}</span>
      </div>
    </div>
  );
}
