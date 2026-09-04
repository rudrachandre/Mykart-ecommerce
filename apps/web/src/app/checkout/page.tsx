import { cookies } from 'next/headers';
import { getCart } from '@/lib/api/cart';
import { getAddresses } from '@/lib/api/users';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CheckoutClient } from '@/components/checkout/CheckoutClient';

export const metadata = {
  title: 'Checkout | MyKart',
  description: 'Complete your purchase',
};

export default async function CheckoutPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  if (!token) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-4">Checkout</h1>
        <p className="text-muted-foreground mb-8">Please sign in to checkout.</p>
        <Link href="/login">
          <Button>Sign In</Button>
        </Link>
      </div>
    );
  }

  let cart;
  let savedAddresses: any[] = [];
  try {
    const [cartData, addressData] = await Promise.all([
      getCart(token),
      getAddresses(token).catch(() => []),
    ]);
    cart = cartData;
    savedAddresses = Array.isArray(addressData) ? addressData : [];
  } catch (error) {
    cart = { items: [] };
    savedAddresses = [];
  }

  const items = cart.items || [];
  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-4">Checkout</h1>
        <p className="text-muted-foreground mb-8">Your cart is empty.</p>
        <Link href="/products">
          <Button>Continue Shopping</Button>
        </Link>
      </div>
    );
  }

  const subtotal = items.reduce((acc: number, item: any) => acc + (parseFloat(item.price) * item.quantity), 0);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>
      <CheckoutClient token={token} items={items} subtotal={subtotal} savedAddresses={savedAddresses} />
    </div>
  );
}
