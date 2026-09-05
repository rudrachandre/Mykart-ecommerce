"use client";

import { FormEvent, useState } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { onboardSeller } from "@/lib/api/sellers";
import { toast } from "sonner";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function OnboardSellerForm({
  token,
  isExistingSeller = false,
}: {
  token: string;
  isExistingSeller?: boolean;
}) {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [storeName, setStoreName] = useState("");
  const [description, setDescription] = useState("");
  const [logo, setLogo] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    // Client-side validation mirroring OnboardSellerDto requirements.
    if (storeName.trim().length < 3) {
      setError("Store name must be at least 3 characters long.");
      return;
    }
    if (logo && !/^https?:\/\/.+/.test(logo.trim())) {
      setError("Logo must be a valid URL starting with http:// or https://");
      return;
    }

    setIsSubmitting(true);

    try {
      await onboardSeller(token, {
        storeName: storeName.trim(),
        description: description.trim() || undefined,
        logo: logo.trim() || undefined,
      });

      // The fresh SELLER role only appears in a new access token (Module 13
      // JWT design), so mint one via the existing refresh endpoint before
      // navigating to the seller dashboard.
      try {
        const refreshRes = await fetch(`${apiUrl}/api/v1/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json().catch(() => null);
          if (data?.accessToken) {
            Cookies.set("accessToken", data.accessToken, {
              sameSite: "strict",
              secure: process.env.NODE_ENV === "production",
            });
          }
        }
      } catch {
        // Non-fatal: the user can still refresh via the normal session flow.
      }

      await refreshUser();
      toast.success("Your store is ready!");
      router.push("/seller");
      router.refresh();
    } catch (err: any) {
      const message =
        err?.message || "Unable to create your store. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">
          {isExistingSeller ? "Complete Your Seller Store Setup" : "Become a Seller"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isExistingSeller
            ? "Your account has seller permissions. Create your store profile below to start listing products on MyKart."
            : "Set up your store details and start selling your products on MyKart."}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 border p-6 rounded-lg bg-card"
      >
        <div>
          <label htmlFor="storeName" className="text-sm font-medium mb-1 block">
            Store Name
          </label>
          <Input
            id="storeName"
            type="text"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            required
            maxLength={60}
            placeholder="Your Store Name"
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="description" className="text-sm font-medium mb-1 block">
            Description (Optional)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            placeholder="Tell us about your store..."
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="logo" className="text-sm font-medium mb-1 block">
            Logo URL (Optional)
          </label>
          <Input
            id="logo"
            type="url"
            value={logo}
            onChange={(e) => setLogo(e.target.value)}
            placeholder="https://example.com/logo.png"
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        {error && (
          <p className="text-sm text-destructive font-medium" role="alert">
            {error}
          </p>
        )}

        <Button className="w-full" type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? "Creating your store..."
            : isExistingSeller
            ? "Complete Store Setup"
            : "Create Store"}
        </Button>
      </form>
    </div>
  );
}
