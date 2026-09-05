import { WishlistContent } from '@/components/wishlist/WishlistContent';

export const metadata = {
  title: 'Your Wishlist | MyKart',
  description: 'View and manage your saved wishlist items.',
};

export default function WishlistPage() {
  return <WishlistContent isAccountShell={false} />;
}
