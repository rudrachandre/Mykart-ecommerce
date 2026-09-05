"use client";

import { useEffect, useRef, useState } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function GoogleCallbackPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const isNavigatingRef = useRef(false);

  // Reaction 1: If AuthContext already has an authenticated user, redirect immediately!
  useEffect(() => {
    if (user && !isNavigatingRef.current) {
      isNavigatingRef.current = true;
      window.location.href = "/";
    }
  }, [user]);

  // Reaction 2: Orchestrate session exchange gracefully without false error states
  useEffect(() => {
    let isMounted = true;

    async function exchangeOAuthSession() {
      // If user is already authenticated in AuthContext, do not execute exchange
      if (user || isNavigatingRef.current) {
        return;
      }

      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts && isMounted && !isNavigatingRef.current) {
        try {
          attempts++;

          // Attempt 1+: Call refreshUser() from AuthContext so token requests are deduplicated
          await refreshUser();

          // Check if token or user is now available
          const hasToken = !!Cookies.get("accessToken");
          if (hasToken || user) {
            if (!isNavigatingRef.current) {
              isNavigatingRef.current = true;
              window.location.href = "/";
            }
            return;
          }

          // Fallback: If refreshUser() didn't set token yet, try explicit POST /api/v1/auth/refresh
          const res = await fetch(`${apiUrl}/api/v1/auth/refresh`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          });

          if (res.ok) {
            const data = await res.json();
            if (data?.accessToken) {
              Cookies.set("accessToken", data.accessToken, {
                sameSite: "lax",
                secure: process.env.NODE_ENV === "production",
              });
              await refreshUser();
              if (!isNavigatingRef.current) {
                isNavigatingRef.current = true;
                window.location.href = "/";
              }
              return;
            }
          }
        } catch (err) {
          console.warn(`[GoogleCallback] Session exchange attempt ${attempts} warning:`, err);
        }

        // If attempt didn't succeed, wait before retrying without displaying an error state
        if (attempts < maxAttempts && isMounted && !isNavigatingRef.current) {
          await new Promise((res) => setTimeout(res, 600));
        }
      }

      // Final check: check if token was set asynchronously during retries
      const finalToken = Cookies.get("accessToken");
      if (finalToken && !isNavigatingRef.current) {
        isNavigatingRef.current = true;
        window.location.href = "/";
        return;
      }

      // Only if ALL retries have definitively failed and no token/user exists
      if (isMounted && !isNavigatingRef.current && !user && !finalToken) {
        console.error("[GoogleCallback] All session exchange attempts failed.");
        setError("Google authentication failed. Redirecting to login...");
        setTimeout(() => {
          if (isMounted) {
            router.push("/login?error=google_auth_failed");
          }
        }, 1500);
      }
    }

    exchangeOAuthSession();

    return () => {
      isMounted = false;
    };
  }, [refreshUser, router, user]);

  return (
    <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center bg-secondary px-4">
      <div className="text-center bg-card border border-border p-8 rounded-xl shadow-sm max-w-sm w-full">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4" />
        <h2 className="font-display text-lg font-semibold text-foreground mb-1">
          Completing Google Sign-In
        </h2>
        <p className="text-xs text-muted-foreground">
          {error || "Securing your session..."}
        </p>
      </div>
    </div>
  );
}
