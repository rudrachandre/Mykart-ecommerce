"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Activity, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {

  
  useEffect(() => {
    console.error("[Page Error Boundary]", error);
  }, [error]);

  return (
    <div className="container mx-auto px-4 py-24 text-center max-w-xl">
      <div className="bg-card border rounded-2xl p-12 shadow-sm">
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Activity className="w-10 h-10 text-destructive" />
        </div>
        <h1 className="text-3xl font-extrabold mb-4 tracking-tight">
          Something went wrong
        </h1>
        <p className="text-muted-foreground mb-6 text-lg">
          We hit an unexpected error while loading this page. Please try again.
        </p>

        {error && (
          <details className="text-left bg-muted p-4 rounded-lg mb-8 text-xs font-mono max-h-40 overflow-y-auto border border-border">
            <summary className="cursor-pointer font-semibold text-foreground/75 select-none mb-2">
              View Error Details (Debugging)
            </summary>
            <p className="text-destructive font-bold mb-1">{error.message || error.toString()}</p>
            {error.digest && <p className="text-muted-foreground mb-1">Digest: {error.digest}</p>}
            {error.stack && <pre className="whitespace-pre-wrap opacity-75">{error.stack}</pre>}
          </details>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            className="w-full sm:w-auto rounded-full font-semibold px-8 hover:scale-105 active:scale-95 transition-all"
            onClick={reset}
          >
            Try Again
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full sm:w-auto rounded-full font-semibold px-8 hover:scale-105 active:scale-95 transition-all"
          >
            <Link href="/">
              <Home className="mr-2 w-4 h-4" /> Back to Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}