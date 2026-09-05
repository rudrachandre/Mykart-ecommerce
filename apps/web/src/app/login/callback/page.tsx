"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function GoogleCallbackPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function exchangeOAuthSession() {
      let attempts = 0;
      const maxAttempts = 3;
      let lastError: Error | null = null;

      while (attempts < maxAttempts) {
        try {
          attempts++;
          const res = await fetch(`${apiUrl}/api/v1/auth/refresh`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          });

          if (!res.ok) {
            throw new Error(`OAuth session exchange HTTP ${res.status}`);
          }

          const data = await res.json();
          if (!data?.accessToken) {
            throw new Error("No access token returned from session exchange");
          }

          // Save access token securely in cookie
          Cookies.set("accessToken", data.accessToken, {
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
          });

          // Hydrate AuthContext state
          await refreshUser();

          if (isMounted) {
            // Full page reload redirect to ensure clean context transition
            window.location.href = "/";
          }
          return;
        } catch (err: any) {
          lastError = err;
          console.warn(`[GoogleCallback] Attempt ${attempts} failed:`, err?.message || err);
          if (attempts < maxAttempts) {
            await new Promise((res) => setTimeout(res, 600));
          }
        }
      }

      if (isMounted) {
        console.error("[GoogleCallback] All authentication exchange attempts failed:", lastError);
        setError("Google authentication failed. Redirecting to login...");
        setTimeout(() => {
          router.push("/login?error=google_auth_failed");
        }, 1500);
      }
    }

    exchangeOAuthSession();

    return () => {
      isMounted = false;
    };
  }, [refreshUser, router]);

  return (
    <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center bg-secondary px-4">
      <div className="text-center bg-card border border-border p-8 rounded-xl shadow-sm max-w-sm w-full">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4" />
        <h2 className="font-display text-lg font-semibold text-foreground mb-1">
          Completing Google Sign-In
        </h2>
        <p className="text-xs text-muted-foreground">
          {error || "Securing session and redirecting..."}
        </p>
      </div>
    </div>
  );
}
