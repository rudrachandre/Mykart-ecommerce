import { Skeleton } from "@/components/ui/skeleton";

export default function OrdersLoading() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
        <Skeleton className="h-12 w-64 rounded-lg" />
        <Skeleton className="h-6 w-32 rounded-lg" />
      </div>
      <div className="space-y-12">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="border border-border/40 bg-background overflow-hidden">
            <div className="flex flex-wrap justify-between items-center p-6 bg-secondary border-b border-border/40 gap-6">
              <Skeleton className="h-12 w-40 rounded-lg" />
              <Skeleton className="h-12 w-24 rounded-lg" />
              <Skeleton className="h-12 w-24 rounded-lg" />
            </div>
            <div className="p-8 space-y-6">
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}