import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSellerProfile } from "@/lib/api/sellers";
import { getProfile } from "@/lib/api/users";
import { OnboardSellerForm } from "./OnboardSellerForm";

export const metadata = {
  title: "Seller Store Setup | MyKart",
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

  let isExistingSeller = false;
  try {
    const userProfile = await getProfile(token);
    if (userProfile?.role === "SELLER") {
      isExistingSeller = true;
    }
  } catch {
    // Fallback: default to customer onboarding
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <OnboardSellerForm token={token} isExistingSeller={isExistingSeller} />
    </div>
  );
}

