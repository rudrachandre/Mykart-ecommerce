"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import Cookies from "js-cookie";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;
if (!apiUrl && process.env.NODE_ENV === "production")
  throw new Error("NEXT_PUBLIC_API_URL is required");
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

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();
  const callbackUrl = useMemo(
    () => getSafeCallbackUrl(searchParams.get("callbackUrl")),
    [searchParams],
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`${finalApiUrl}/api/v1/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.accessToken) {
        setError(
          data?.message || "Unable to sign in. Check your email and password.",
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
      setError("Unable to reach the sign-in service. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-5rem)] md:min-h-[calc(100vh-6rem)] bg-background">
      {/* Left side: Premium Image */}
      <div className="hidden lg:flex lg:w-[45%] relative bg-secondary items-center justify-center overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1611078489935-0cb964de46d6?q=80&w=2000&auto=format&fit=crop"
          alt="MyKart Premium"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/10" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center p-12 text-white"
        >
          <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight mb-3">
            MyKart.
          </h1>
          <p className="text-white/90 font-medium tracking-wide">
            Curated for excellence.
          </p>
        </motion.div>
      </div>

      {/* Right side: Login Form */}
      <div className="w-full lg:w-[55%] flex flex-col justify-center px-8 sm:px-16 lg:px-24 xl:px-32 relative py-12">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-md mx-auto space-y-10"
        >
          <div>
            <h2 className="text-3xl font-medium tracking-tight text-foreground">
              Sign In
            </h2>
            <p className="mt-3 text-sm text-foreground/60 font-light leading-relaxed">
              Enter your credentials to access your account and personalized
              shopping experience.
            </p>
          </div>

          <form className="space-y-8" onSubmit={handleSubmit}>
            <div className="space-y-6">
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
                <div className="flex items-center justify-between">
                  <label
                    className="text-xs font-semibold uppercase tracking-widest text-foreground"
                    htmlFor="password"
                  >
                    Password
                  </label>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-12 rounded-lg border-input bg-secondary px-4 text-sm"
                  placeholder="••••••••"
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
              {isSubmitting ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            New to mykart?{" "}
            <Link
              href={
                callbackUrl !== "/"
                  ? `/register?callbackUrl=${encodeURIComponent(callbackUrl)}`
                  : "/register"
              }
              className="font-semibold text-brand underline-offset-4 hover:underline"
            >
              Create an account
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center">
          <div className="animate-pulse w-12 h-12 rounded-full bg-primary/20" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
