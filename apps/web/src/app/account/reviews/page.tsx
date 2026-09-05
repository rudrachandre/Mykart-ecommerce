import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getMyReviews } from '@/lib/api/reviews';
import ReviewsClient from './ReviewsClient';

export const metadata = {
  title: 'My Reviews | MyKart',
  description: 'Manage your product reviews and ratings.',
};

export default async function AccountReviewsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  if (!token) redirect('/login');

  let reviews: any[] = [];
  try {
    reviews = await getMyReviews(token);
  } catch (err) {
    console.error('Failed to fetch user reviews:', err);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-border/40">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-1">My Reviews</h1>
          <p className="text-muted-foreground text-sm">View and manage your product ratings & feedback.</p>
        </div>
        <span className="bg-primary/10 text-primary font-bold px-3 py-1 rounded-full text-xs">
          {reviews.length} {reviews.length === 1 ? 'Review' : 'Reviews'} Total
        </span>
      </div>

      <ReviewsClient initialReviews={reviews} token={token} />
    </div>
  );
}
