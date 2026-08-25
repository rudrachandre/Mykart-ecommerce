import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PackageSearch, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="container mx-auto px-4 py-24 text-center max-w-xl">
      <div className="bg-card border rounded-2xl p-12 shadow-sm">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <PackageSearch className="w-10 h-10 text-primary" />
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/50 mb-3">
          404
        </p>
        <h1 className="text-3xl font-extrabold mb-4 tracking-tight">
          Page Not Found
        </h1>
        <p className="text-muted-foreground mb-8 text-lg">
          The page you are looking for does not exist or may have moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            asChild
            className="w-full sm:w-auto rounded-full font-semibold px-8 hover:scale-105 active:scale-95 transition-all"
          >
            <Link href="/">
              <Home className="mr-2 w-4 h-4" /> Back to Home
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full sm:w-auto rounded-full font-semibold px-8 hover:scale-105 active:scale-95 transition-all"
          >
            <Link href="/products">Browse Products</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}