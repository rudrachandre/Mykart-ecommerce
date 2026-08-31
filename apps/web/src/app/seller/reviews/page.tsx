import { cookies } from 'next/headers';
import { getSellerReviews } from '@/lib/api/sellers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Customer Reviews | Seller Dashboard',
};

export default async function SellerReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; limit?: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  if (!token) {
    redirect('/login');
  }

  const resolvedParams = await searchParams;
  const page = resolvedParams.page ? parseInt(resolvedParams.page, 10) : 1;
  const limit = resolvedParams.limit ? parseInt(resolvedParams.limit, 10) : 10;

  let reviewsData;
  try {
    reviewsData = await getSellerReviews(token, page, limit);
  } catch (error) {
    redirect('/seller/onboard');
  }

  const { items: reviews, meta } = reviewsData;

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/30'}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <Link href="/seller" className="text-sm text-primary hover:underline mb-2 block">
            &larr; Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold">Product Reviews</h1>
          <p className="text-muted-foreground text-sm mt-1">What customers are saying about your products</p>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="text-center py-16 border rounded-lg bg-muted/20">
          <p className="text-lg text-muted-foreground">No product reviews yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="divide-y border rounded-lg bg-card overflow-hidden">
            {reviews.map((review: any) => (
              <div key={review.id} className="p-6 hover:bg-muted/5 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-foreground">{review.title || 'Untitled Review'}</h3>
                    <div className="flex items-center gap-4 mt-2">
                      {renderStars(review.rating)}
                      <span className="text-xs text-muted-foreground">
                        by {review.user?.name || 'Guest'} on {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded font-semibold uppercase tracking-wider ${review.verifiedPurchase ? 'bg-green-100 text-green-800' : 'bg-muted text-muted-foreground'}`}>
                    {review.verifiedPurchase ? 'Verified Purchase' : 'Standard'}
                  </span>
                </div>
                <p className="text-foreground/80 text-sm leading-relaxed mb-4">{review.comment}</p>
                <div className="pt-3 border-t text-xs flex justify-between items-center text-muted-foreground">
                  <span>Product: <Link href={`/products/${review.product.slug}`} className="text-primary hover:underline font-medium">{review.product.name}</Link></span>
                  <span>Helpful Votes: {review.helpfulVotes || 0}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8">
              <Link
                href={`/seller/reviews?page=${page - 1}`}
                className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
              >
                <Button variant="outline" size="sm">Previous</Button>
              </Link>
              <span className="text-sm text-muted-foreground">
                Page {meta.page} of {meta.totalPages}
              </span>
              <Link
                href={`/seller/reviews?page=${page + 1}`}
                className={page >= meta.totalPages ? 'pointer-events-none opacity-50' : ''}
              >
                <Button variant="outline" size="sm">Next</Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
