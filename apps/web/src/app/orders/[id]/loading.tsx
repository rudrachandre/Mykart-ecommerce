import { Skeleton } from "@/components/ui/skeleton";

export default function OrderDetailLoading() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <Skeleton className="h-4 w-24 rounded-lg mb-6" />
      <Skeleton className="h-12 w-64 rounded-lg mb-10" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-10 w-48 rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-[200px] w-full rounded-lg" />
          <Skeleton className="h-[160px] w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}