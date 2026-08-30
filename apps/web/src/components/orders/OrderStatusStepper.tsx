'use client';

import { Check } from 'lucide-react';
import { motion } from 'framer-motion';

const STEPS = [
  { id: 'PENDING', label: 'Order Placed' },
  { id: 'PROCESSING', label: 'Processing' },
  { id: 'SHIPPED', label: 'Shipped' },
  { id: 'DELIVERED', label: 'Delivered' }
];

export function OrderStatusStepper({ currentStatus }: { currentStatus: string }) {
  if (currentStatus === 'CANCELLED' || currentStatus === 'FAILED') {
    return (
      <div className="p-4 mb-8 bg-destructive/10 border border-destructive/20 text-destructive font-medium rounded-lg text-center uppercase tracking-widest text-sm">
        Order {currentStatus}
      </div>
    );
  }

  if (currentStatus === 'RETURN_REQUESTED') {
    return (
      <div className="p-4 mb-8 bg-yellow-50 border border-yellow-200 text-yellow-900 font-medium rounded-lg text-center uppercase tracking-widest text-sm">
        Return Requested
      </div>
    );
  }

  if (currentStatus === 'RETURNED') {
    return (
      <div className="p-4 mb-8 bg-blue-50 border border-blue-200 text-blue-900 font-medium rounded-lg text-center uppercase tracking-widest text-sm">
        Returned
      </div>
    );
  }

  if (currentStatus === 'REPLACEMENT_REQUESTED') {
    return (
      <div className="p-4 mb-8 bg-purple-50 border border-purple-200 text-purple-900 font-medium rounded-lg text-center uppercase tracking-widest text-sm">
        Replacement Requested
      </div>
    );
  }

  if (currentStatus === 'REPLACED') {
    return (
      <div className="p-4 mb-8 bg-green-50 border border-green-200 text-green-900 font-medium rounded-lg text-center uppercase tracking-widest text-sm">
        Replaced
      </div>
    );
  }

  if (currentStatus === 'REFUND_PENDING' || currentStatus === 'REFUNDED') {
    return (
      <div className="p-4 mb-8 bg-orange-50 border border-orange-200 text-orange-900 font-medium rounded-lg text-center uppercase tracking-widest text-sm">
        {currentStatus === 'REFUNDED' ? 'Refunded' : 'Refund Pending'}
      </div>
    );
  }

  const currentIndex = STEPS.findIndex(s => s.id === currentStatus);
  const activeIndex = currentIndex === -1 ? 0 : currentIndex;

  return (
    <div className="w-full mb-16 px-4 md:px-12">
      <div className="relative flex justify-between items-center w-full">
        {/* Background Line */}
        <div className="absolute top-1/2 left-0 w-full h-[2px] bg-border -translate-y-1/2 z-0" />
        
        {/* Active Line */}
        <motion.div 
          initial={{ width: '0%' }}
          animate={{ width: `${(activeIndex / (STEPS.length - 1)) * 100}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute top-1/2 left-0 h-[2px] bg-foreground -translate-y-1/2 z-0" 
        />
        
        {STEPS.map((step, index) => {
          const isCompleted = index <= activeIndex;
          const isCurrent = index === activeIndex;
          
          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.2 }}
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors duration-500 bg-background
                  ${isCompleted ? 'border-foreground' : 'border-border'}
                  ${isCurrent ? 'ring-4 ring-foreground/10' : ''}
                `}
              >
                {isCompleted ? (
                  <Check className={`w-4 h-4 ${isCurrent && currentStatus !== 'DELIVERED' ? 'text-foreground opacity-50' : 'text-foreground'}`} />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-border" />
                )}
              </motion.div>
              <div className="absolute top-10 whitespace-nowrap text-xs font-semibold uppercase tracking-widest text-center mt-2">
                <span className={isCompleted ? 'text-foreground' : 'text-foreground/40'}>
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
