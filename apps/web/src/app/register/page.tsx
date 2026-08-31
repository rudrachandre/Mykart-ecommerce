"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import Cookies from "js-cookie";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;
if (!apiUrl && process.env.NODE_ENV === "production") {
  console.warn("NEXT_PUBLIC_API_URL is required");
}
const finalApiUrl = apiUrl || "http://localhost:3001";

function getSafeCallbackUrl(callbackUrl: string | null) {
  if (
    !callbackUrl ||
    !callbackUrl.startsWith("/") ||
    callbackUrl.startsWith("//")
  ) {
    return "/";
  }
  return callbackUrl;
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();
  const callbackUrl = useMemo(
    () => getSafeCallbackUrl(searchParams.get("callbackUrl")),
    [searchParams],
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    // Client-side validation mirrors the API contract (RegisterDto).
    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${finalApiUrl}/api/v1/auth/register`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.accessToken) {
        // Surface only safe, user-facing messages from the API.
        setError(
          data?.message || "Unable to create your account. Please try again.",
        );
        return;
      }

      Cookies.set("accessToken", data.accessToken, {
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
      });
      await refreshUser();
      router.replace(callbackUrl);
      router.refresh();
    } catch {
      setError("Unable to reach the registration service. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center bg-secondary px-4 py-12 md:min-h-[calc(100vh-6rem)]">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <div className="rounded-lg border border-border bg-card p-8 shadow-sm sm:p-10">
          <Link
            href="/"
            aria-label="mykart home"
            className="inline-block font-display text-2xl font-semibold tracking-tight text-foreground"
          >
            mykart
          </Link>

          <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight text-foreground">
            Create Account
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Join MyKart for a personalized shopping experience.
          </p>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div className="space-y-3">
                <label
                  className="text-xs font-semibold uppercase tracking-widest text-foreground"
                  htmlFor="name"
                >
                  Full Name
                </label>
                <Input
                  id="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="h-12 rounded-lg border-input bg-secondary px-4 text-sm"
                  placeholder="Jane Doe"
                  required
                />
              </div>
              <div className="space-y-3">
                <label
                  className="text-xs font-semibold uppercase tracking-widest text-foreground"
                  htmlFor="email"
                >
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-12 rounded-lg border-input bg-secondary px-4 text-sm"
                  placeholder="name@example.com"
                  required
                />
              </div>
              <div className="space-y-3">
                <label
                  className="text-xs font-semibold uppercase tracking-widest text-foreground"
                  htmlFor="password"
                >
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-12 rounded-lg border-input bg-secondary px-4 text-sm"
                  placeholder="At least 8 characters"
                  minLength={8}
                  required
                />
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-destructive font-medium"
                role="alert"
              >
                {error}
              </motion.p>
            )}

            <Button
              className="h-12 w-full rounded-lg font-display text-[15px] font-semibold"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href={
                callbackUrl !== "/"
                  ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
                  : "/login"
              }
              className="font-semibold text-brand underline-offset-4 hover:underline"
            >
              Sign In
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center">
          <div className="animate-pulse w-12 h-12 rounded-full bg-primary/20" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
