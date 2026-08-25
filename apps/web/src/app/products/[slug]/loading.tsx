import { Skeleton } from "@/components/ui/skeleton";

export default function ProductDetailLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-[1400px]">
      <Skeleton className="h-4 w-32 rounded-lg mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
        <div className="lg:col-span-7">
          <Skeleton className="h-[520px] w-full rounded-lg" />
        </div>
        <div className="lg:col-span-5 space-y-6">
          <Skeleton className="h-6 w-24 rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-6 w-40 rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-14 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}