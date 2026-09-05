import { WishlistContent } from '@/components/wishlist/WishlistContent';

export const metadata = {
  title: 'My Wishlist | MyKart',
  description: 'Manage your saved wishlist items.',
};

export default function AccountWishlistPage() {
  return <WishlistContent isAccountShell={true} />;
}
