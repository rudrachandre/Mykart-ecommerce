'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Cookies from 'js-cookie';
import { getAdminReviews, updateReviewStatus, deleteReview } from '@/lib/api/admin';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { MessageSquare, Star, Check, AlertTriangle, Trash } from 'lucide-react';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [reportedOnly, setReportedOnly] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const limit = 10;
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);

  const getAuthToken = () => {
    return Cookies.get('accessToken') || (typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '');
  };

  const loadReviews = async () => {
    const token = getAuthToken();
    try {
      setLoading(true);
      setError(null);
      const skip = (page - 1) * limit;
      const data = await getAdminReviews(token, skip, limit, reportedOnly);
      let items = data.reviews || [];
      if (ratingFilter) {
        items = items.filter((r: any) => r.rating === ratingFilter);
      }
      setReviews(items);
      setTotal(data.total || items.length);
    } catch (err: any) {
      setError(err?.message || 'Failed to load reviews from server');
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [page, reportedOnly, ratingFilter]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    const token = getAuthToken();
    try {
      setUpdatingId(id);
      await updateReviewStatus(token, id, newStatus);
      toast.success(`Review set to ${newStatus}`);
      loadReviews();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update review status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this review permanently?')) return;
    const token = getAuthToken();
    try {
      setUpdatingId(id);
      await deleteReview(token, id);
      toast.success('Review deleted permanently');
      loadReviews();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete review');
    } finally {
      setUpdatingId(null);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`w-3.5 h-3.5 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/30'}`}
          />
        ))}
      </div>
    );
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link href="/admin" className="text-sm text-primary hover:underline mb-2 block">
            &larr; Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="w-8 h-8 text-primary" /> Product Reviews Moderation <span className="text-xl font-normal text-muted-foreground">({total})</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Audit, moderate, or remove customer reviews and spam ratings.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={reportedOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setReportedOnly(true); setPage(1); }}
          >
            Reported Only
          </Button>
          <Button
            variant={!reportedOnly && ratingFilter === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setReportedOnly(false); setRatingFilter(null); setPage(1); }}
          >
            All Reviews
          </Button>
          <div className="flex items-center gap-1 border rounded-md p-1 bg-background text-xs">
            <span className="text-muted-foreground px-1">Rating:</span>
            {[5, 4, 3, 2, 1].map((stars) => (
              <button
                key={stars}
                onClick={() => {
                  setRatingFilter((prev) => (prev === stars ? null : stars));
                  setPage(1);
                }}
                className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors ${
                  ratingFilter === stars ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                {stars}★
              </button>
            ))}
          </div>
        </div>
      </div>

      {error ? (
        <div className="text-center py-16 border rounded-lg bg-destructive/10 border-destructive/20">
          <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
          <p className="text-lg text-destructive font-semibold">Failed to load reviews</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={loadReviews}>
            Retry
          </Button>
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16 border rounded-lg bg-muted/20">
          <p className="text-lg text-muted-foreground">No reviews found matching filters.</p>
        </div>
      ) : (
        <>
          <div className="border rounded-lg bg-card overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground border-b text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-4">Review Date</th>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4">Rating & Content</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {reviews.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/50">
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-xs">{r.user?.name || 'Guest'}</p>
                      <p className="text-[10px] text-muted-foreground">{r.user?.email || '-'}</p>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <Link href={`/products/${r.product?.slug}`} className="text-primary hover:underline font-semibold line-clamp-1">
                        {r.product?.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 max-w-sm">
                      <div className="flex items-center gap-2 mb-1">
                        {renderStars(r.rating)}
                        {r.verifiedPurchase && (
                          <span className="text-[10px] bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300 px-1.5 py-0.5 rounded font-medium border border-green-200 dark:border-green-800">
                            ✓ Verified Purchase
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-xs text-foreground line-clamp-1">{r.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{r.comment}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${r.status === 'APPROVED' ? 'bg-green-500/20 text-green-700' : r.status === 'SPAM' ? 'bg-red-500/20 text-red-700' : 'bg-yellow-500/20 text-yellow-700'}`}>
                          {r.status}
                        </span>
                        {r.reported && (
                          <span className="flex items-center gap-1 text-[9px] text-red-600 font-bold bg-red-100 px-1 rounded uppercase tracking-wider">
                            <AlertTriangle className="w-2.5 h-2.5" /> Reported
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {r.status !== 'APPROVED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            disabled={updatingId === r.id}
                            onClick={() => handleStatusChange(r.id, 'APPROVED')}
                          >
                            <Check className="w-3.5 h-3.5" /> Approve
                          </Button>
                        )}
                        {r.status !== 'SPAM' && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={updatingId === r.id}
                            onClick={() => handleStatusChange(r.id, 'SPAM')}
                          >
                            Spam
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={updatingId === r.id}
                          onClick={() => handleDelete(r.id)}
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-6">
              <p className="text-xs text-muted-foreground">
                Showing {(page - 1) * limit + 1} - {Math.min(page * limit, total)} of {total}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((prev) => prev - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((prev) => prev + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
