import { Skeleton } from "@/components/ui/skeleton";

export default function SearchLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Skeleton className="h-8 w-56 rounded-lg mb-4" />
      </div>
      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-56 shrink-0">
          <Skeleton className="h-[400px] rounded-lg w-full" />
        </div>
        <div className="flex-1">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}