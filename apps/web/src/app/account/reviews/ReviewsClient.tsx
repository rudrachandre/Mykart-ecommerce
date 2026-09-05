'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star, Trash2, CheckCircle2, MessageSquare, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { deleteReview } from '@/lib/api/reviews';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function ReviewsClient({ initialReviews, token }: { initialReviews: any[]; token: string }) {
  const [reviews, setReviews] = useState(initialReviews);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return;
    setDeletingId(id);
    try {
      await deleteReview(token, id);
      setReviews((prev) => prev.filter((r) => r.id !== id));
      toast.success('Review deleted');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete review');
    } finally {
      setDeletingId(null);
    }
  };

  if (reviews.length === 0) {
    return (
      <div className="text-center py-16 border border-dashed rounded-xl bg-card">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="w-8 h-8 text-muted-foreground opacity-50" />
        </div>
        <h2 className="text-lg font-bold text-foreground mb-1">No reviews submitted yet</h2>
        <p className="text-muted-foreground text-sm mb-6">
          Write reviews for products you have purchased from your order details page.
        </p>
        <Link href="/account/orders">
          <Button size="sm" className="rounded-full px-6 font-semibold">
            View My Orders
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {reviews.map((review) => {
        const product = review.product;
        const imageUrl = product?.images?.[0]?.url;

        return (
          <div key={review.id} className="border border-border/40 bg-card rounded-xl p-6 shadow-sm flex flex-col md:flex-row gap-6 justify-between items-start">
            <div className="flex gap-4 items-start flex-1">
              <div className="w-16 h-20 bg-secondary flex-shrink-0 rounded-lg border border-border/40 overflow-hidden relative">
                {imageUrl ? (
                  <Image src={imageUrl} alt={product?.name || 'Product'} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="space-y-2 flex-1">
                {product && (
                  <Link href={`/products/${product.slug}`} className="font-semibold text-base hover:underline hover:text-primary transition-colors line-clamp-1">
                    {product.name}
                  </Link>
                )}

                {/* Rating stars */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'
                        }`}
                      />
                    ))}
                  </div>
                  {review.verifiedPurchase && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" /> Verified Purchase
                    </span>
                  )}
                </div>

                {review.title && <h3 className="font-bold text-sm text-foreground">{review.title}</h3>}
                {review.comment && <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>}

                <p className="text-xs text-muted-foreground pt-1">
                  Reviewed on {new Date(review.createdAt || Date.now()).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDelete(review.id)}
              disabled={deletingId === review.id}
              className="text-xs font-bold uppercase tracking-wider border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground self-end md:self-start"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              {deletingId === review.id ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
