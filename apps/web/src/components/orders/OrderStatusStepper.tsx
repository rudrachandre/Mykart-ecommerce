'use client';

import { Check, XCircle, RotateCcw, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const STEPS = [
  { id: 'PENDING', label: 'Order Placed' },
  { id: 'PROCESSING', label: 'Processing' },
  { id: 'SHIPPED', label: 'Shipped' },
  { id: 'DELIVERED', label: 'Delivered' },
];

export function OrderStatusStepper({ currentStatus }: { currentStatus: string }) {
  if (currentStatus === 'CANCELLED' || currentStatus === 'FAILED') {
    return (
      <div className="p-4 mb-8 bg-destructive/10 border border-destructive/20 text-destructive font-semibold rounded-xl flex items-center justify-center gap-2 text-sm uppercase tracking-wider">
        <XCircle className="w-5 h-5 flex-shrink-0" />
        <span>Order {currentStatus}</span>
      </div>
    );
  }

  if (currentStatus === 'RETURN_REQUESTED') {
    return (
      <div className="p-4 mb-8 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 font-semibold rounded-xl flex items-center justify-center gap-2 text-sm uppercase tracking-wider">
        <RotateCcw className="w-5 h-5 flex-shrink-0" />
        <span>Return Requested — Awaiting Seller Approval</span>
      </div>
    );
  }

  if (currentStatus === 'RETURNED') {
    return (
      <div className="p-4 mb-8 bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400 font-semibold rounded-xl flex items-center justify-center gap-2 text-sm uppercase tracking-wider">
        <RotateCcw className="w-5 h-5 flex-shrink-0" />
        <span>Item Returned & Processed</span>
      </div>
    );
  }

  if (currentStatus === 'REPLACEMENT_REQUESTED') {
    return (
      <div className="p-4 mb-8 bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-400 font-semibold rounded-xl flex items-center justify-center gap-2 text-sm uppercase tracking-wider">
        <RefreshCw className="w-5 h-5 flex-shrink-0" />
        <span>Replacement Requested — Awaiting Processing</span>
      </div>
    );
  }

  if (currentStatus === 'REPLACED') {
    return (
      <div className="p-4 mb-8 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-semibold rounded-xl flex items-center justify-center gap-2 text-sm uppercase tracking-wider">
        <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
        <span>Replacement Shipped & Completed</span>
      </div>
    );
  }

  if (currentStatus === 'REFUND_PENDING' || currentStatus === 'REFUNDED') {
    return (
      <div className="p-4 mb-8 bg-orange-500/10 border border-orange-500/20 text-orange-700 dark:text-orange-400 font-semibold rounded-xl flex items-center justify-center gap-2 text-sm uppercase tracking-wider">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <span>{currentStatus === 'REFUNDED' ? 'Refund Processed' : 'Refund Pending'}</span>
      </div>
    );
  }

  const currentIndex = STEPS.findIndex((s) => s.id === currentStatus);
  const activeIndex = currentIndex === -1 ? 0 : currentIndex;

  return (
    <div className="w-full mb-12 md:mb-16 px-2 md:px-8">
      <div className="relative flex justify-between items-center w-full">
        {/* Background Line */}
        <div className="absolute top-1/2 left-0 w-full h-[2px] bg-border -translate-y-1/2 z-0" />

        {/* Active Progress Line */}
        <motion.div
          initial={{ width: '0%' }}
          animate={{ width: `${(activeIndex / (STEPS.length - 1)) * 100}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="absolute top-1/2 left-0 h-[2px] bg-primary -translate-y-1/2 z-0"
        />

        {STEPS.map((step, index) => {
          const isCompleted = index <= activeIndex;
          const isCurrent = index === activeIndex;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.15 }}
                className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center border-2 transition-colors duration-300 bg-background
                  ${isCompleted ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground'}
                  ${isCurrent ? 'ring-4 ring-primary/20 scale-110' : ''}
                `}
                aria-label={`${step.label}: ${isCompleted ? 'Completed' : 'Pending'}`}
              >
                {isCompleted ? (
                  <Check className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary-foreground stroke-[3]" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-border" />
                )}
              </motion.div>
              <div className="absolute top-9 md:top-10 whitespace-nowrap text-[10px] md:text-xs font-semibold uppercase tracking-wider text-center">
                <span className={isCompleted ? 'text-foreground font-bold' : 'text-muted-foreground'}>
                  {step.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
