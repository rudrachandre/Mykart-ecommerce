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
    async function exchangeOAuthSession() {
      try {
        // Secure token exchange:
        // The backend callback set the HttpOnly refreshToken cookie and redirected here.
        // We now call POST /api/v1/auth/refresh to fetch a fresh accessToken.
        const res = await fetch(`${apiUrl}/api/v1/auth/refresh`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
          throw new Error("OAuth session exchange failed");
        }

        const data = await res.json();
        if (!data.accessToken) {
          throw new Error("No access token returned");
        }

        // Save access token securely in cookie
        Cookies.set("accessToken", data.accessToken, {
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        });

        // Hydrate AuthContext state
        await refreshUser();

        // Redirect to homepage or user account
        window.location.href = "/";
      } catch (err: any) {
        console.error("[GoogleCallback] Authentication error:", err);
        setError("Google authentication failed. Please try again.");
        setTimeout(() => {
          router.push("/login?error=google_auth_failed");
        }, 2000);
      }
    }

    exchangeOAuthSession();
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
