import type { Metadata } from "next";
import { Outfit, Geist } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/marketing/footer";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { Toaster } from "sonner";
import "./globals.css";

/* Figma §3 — Outfit (display 600–800) + Geist (body 400–700) */
const outfit = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const geist = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MyKart - Premium Electronics",
  description: "The best place to buy premium electronics.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${geist.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background">
        <AuthProvider>
          <CartProvider>
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
            <Toaster position="top-right" richColors />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
