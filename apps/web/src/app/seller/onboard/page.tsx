import { cookies } from "next/headers";
import { redirect } from "next/navigation";
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

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <h1 className="text-3xl font-bold mb-8 text-center">Become a Seller</h1>
      <OnboardSellerForm token={token} />
    </div>
  );
}
