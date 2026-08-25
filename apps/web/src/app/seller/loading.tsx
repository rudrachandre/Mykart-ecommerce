import { Skeleton } from "@/components/ui/skeleton";

export default function SellerLoading() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-6xl min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-16 gap-6">
        <Skeleton className="h-16 w-72 rounded-lg" />
        <div className="flex gap-6">
          <Skeleton className="h-12 w-40 rounded-lg" />
          <Skeleton className="h-12 w-40 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-48 rounded-lg" />
    </div>
  );
}