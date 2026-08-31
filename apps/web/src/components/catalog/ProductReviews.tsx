'use client';

import { useState, useEffect, startTransition } from 'react';
import { getProductReviews, submitReview } from '@/lib/api/reviews';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, ThumbsUp, ShieldCheck } from 'lucide-react';
import Cookies from 'js-cookie';

export function ProductReviews({
  productId,
  productSlug,
}: {
  productId: string;
  productSlug?: string;
}) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchReviews = async () => {
    try {
      const data = await getProductReviews(productId);
      const reviewsList = Array.isArray(data) ? data : (data?.items || []);
      setReviews(reviewsList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    startTransition(() => {
      fetchReviews();
    });
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    
    const token = Cookies.get('accessToken');
    if (!token) {
      setError('You must be logged in to review.');
      setSubmitting(false);
      return;
    }

    try {
      await submitReview(token, { productId, rating, title, comment });
      setTitle('');
      setComment('');
      setRating(5);
      fetchReviews();
    } catch (err: any) {
      setError(err.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  // Cookie access must happen AFTER mount: during SSR there is no document
  // cookie, so reading it during render produced different JSX on server
  // (guest prompt) vs client (form) for signed-in users — React #418
  // hydration mismatch that briefly detached all PDP event handlers.
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  useEffect(() => {
    startTransition(() => {
      setIsLoggedIn(!!Cookies.get('accessToken'));
    });
  }, []);

  // Calculate summary
  const safeReviews = Array.isArray(reviews) ? reviews : [];
  const totalReviews = safeReviews.length;
  const averageRating = totalReviews > 0 
    ? safeReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews 
    : 0;

  const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  safeReviews.forEach(r => {
    if (r.rating >= 1 && r.rating <= 5) {
      ratingCounts[r.rating as keyof typeof ratingCounts]++;
    }
  });

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-semibold tracking-tight mb-8">Customer Reviews</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Rating Summary & Breakdown */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          <div className="bg-muted/30 p-6 rounded-lg border border-border/50">
            <div className="flex items-center gap-4 mb-6">
              <div className="text-5xl font-bold tracking-tighter">{averageRating.toFixed(1)}</div>
              <div className="flex flex-col gap-1">
                <div className="flex text-yellow-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star 
                      key={i} 
                      className={`h-5 w-5 ${i < Math.round(averageRating) ? 'fill-current' : 'text-muted-foreground/30'}`} 
                    />
                  ))}
                </div>
                <div className="text-sm text-muted-foreground font-medium">
                  Based on {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = ratingCounts[star as keyof typeof ratingCounts];
                const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-3 text-sm">
                    <div className="w-12 font-medium flex items-center justify-end gap-1">
                      {star} <Star className="h-3 w-3 fill-current text-muted-foreground" />
                    </div>
                    <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-yellow-500 rounded-full" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="w-8 text-right text-muted-foreground tabular-nums">{count}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-card p-6 rounded-lg border shadow-sm">
            <h3 className="font-semibold text-lg mb-4">Write a Review</h3>
            {isLoggedIn ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md font-medium">{error}</div>}
                
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Overall Rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="p-1 transition-transform hover:scale-110 focus:outline-none"
                      >
                        <Star className={`h-6 w-6 ${star <= rating ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground/30'}`} />
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Add a headline</label>
                  <input 
                    type="text" 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="What's most important to know?"
                    required
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Add a written review</label>
                  <textarea 
                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="What did you like or dislike? What did you use this product for?"
                    required
                  />
                </div>
                
                <Button type="submit" className="w-full font-medium" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Review'}
                </Button>
              </form>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground mb-4">You must be signed in to write a review.</p>
                <Button variant="outline" className="w-full font-medium" asChild>
                  <a href={`/login?callbackUrl=/products/${productSlug || productId}`}>Sign In to Review</a>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Review List */}
        <div className="lg:col-span-8">
          <div className="flex items-center justify-between border-b pb-4 mb-6">
            <h3 className="font-semibold text-lg">Recent Reviews</h3>
          </div>

          <div className="space-y-8">
            {loading ? (
              <div className="space-y-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse flex flex-col gap-3">
                    <div className="h-4 bg-muted rounded w-1/4"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                    <div className="h-16 bg-muted rounded w-full"></div>
                  </div>
                ))}
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-12 bg-muted/20 rounded-lg border border-dashed">
                <p className="text-muted-foreground">No reviews yet. Be the first to share your experience!</p>
              </div>
            ) : (
              reviews.map((review: any) => (
                <div key={review.id} className="pb-8 border-b last:border-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold uppercase">
                      {review.user?.name?.charAt(0) || 'A'}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{review.user?.name || 'Anonymous User'}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                        {new Date(review.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        {review.verifiedPurchase && (
                          <>
                            <span>•</span>
                            <span className="text-green-600 font-medium flex items-center">
                              <ShieldCheck className="h-3 w-3 mr-1" /> Verified Purchase
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex text-yellow-500">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'fill-current' : 'text-muted-foreground/30'}`} />
                      ))}
                    </div>
                    <span className="font-semibold text-foreground">{review.title}</span>
                  </div>

                  {review.comment && (
                    <p className="mt-3 text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                      {review.comment}
                    </p>
                  )}

                  <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground font-medium">
                    <button className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                      <ThumbsUp className="h-3.5 w-3.5" /> Helpful
                    </button>
                    <button className="hover:text-foreground transition-colors">Report</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
