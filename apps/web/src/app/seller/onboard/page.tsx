import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSellerProfile } from "@/lib/api/sellers";
import { OnboardSellerForm } from "./OnboardSellerForm";

export const metadata = {
  title: "Become a Seller | MyKart",
};

export default async function OnboardSellerPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    redirect("/login?callbackUrl=/seller/onboard");
  }

  // Check if user already has an active seller profile/store
  try {
    const profile = await getSellerProfile(token);
    if (profile && (profile.storeName || profile.id)) {
      redirect("/seller");
    }
  } catch {
    // User does not have a seller store yet -> allow onboarding form
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <h1 className="text-3xl font-bold mb-8 text-center">Become a Seller</h1>
      <OnboardSellerForm token={token} />
    </div>
  );
}

