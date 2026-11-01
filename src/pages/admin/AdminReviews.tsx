import React, { useState } from 'react';
import { Star, Check, X, Trash2, MessageSquare, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAllReviews, useApproveReview, useDeleteReview } from '@/hooks/useProductReviews';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/formatters';
import { toast } from 'sonner';
import UserAvatar from '@/components/UserAvatar';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function AdminReviews() {
  const { t, language } = useLanguage();
  const { data: reviews, isLoading } = useAllReviews();
  const approveReview = useApproveReview();
  const deleteReview = useDeleteReview();
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');

  const handleApprove = async (reviewId: string) => {
    try {
      await approveReview.mutateAsync({ reviewId, approved: true });
      toast.success(t('রিভিউ অনুমোদিত', 'Review approved'));
    } catch {
      toast.error(t('ত্রুটি', 'Error'));
    }
  };

  const handleReject = async (reviewId: string) => {
    try {
      await approveReview.mutateAsync({ reviewId, approved: false });
      toast.success(t('রিভিউ প্রত্যাখ্যান করা হয়েছে', 'Review rejected'));
    } catch {
      toast.error(t('ত্রুটি', 'Error'));
    }
  };

  const handleDelete = async (reviewId: string) => {
    try {
      await deleteReview.mutateAsync(reviewId);
      toast.success(t('রিভিউ মুছে ফেলা হয়েছে', 'Review deleted'));
    } catch {
      toast.error(t('ত্রুটি', 'Error'));
    }
  };

  const filteredReviews = reviews?.filter(r => {
    if (filter === 'pending') return !r.is_approved;
    if (filter === 'approved') return r.is_approved;
    return true;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <MessageSquare className="w-7 h-7" />
              {t('রিভিউ ম্যানেজমেন্ট', 'Review Management')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t('গ্রাহকদের রিভিউ দেখুন এবং অনুমোদন করুন', 'View and moderate customer reviews')}
            </p>
          </div>
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('সব রিভিউ', 'All Reviews')}</SelectItem>
              <SelectItem value="pending">{t('পেন্ডিং', 'Pending')}</SelectItem>
              <SelectItem value="approved">{t('অনুমোদিত', 'Approved')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredReviews && filteredReviews.length > 0 ? (
          <div className="space-y-3">
            {filteredReviews.map((review: any) => (
              <div key={review.id} className="bg-card border rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <UserAvatar
                      name={review.profiles?.name || null}
                      avatarUrl={review.profiles?.avatar_url || null}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">
                          {review.profiles?.name || t('অজানা', 'Unknown')}
                        </p>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          review.is_approved
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                        )}>
                          {review.is_approved ? t('অনুমোদিত', 'Approved') : t('পেন্ডিং', 'Pending')}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {language === 'bn' ? review.products?.name_bn : review.products?.name_en}
                        {' • '}
                        {formatDate(review.created_at, language)}
                      </p>
                      <div className="flex items-center gap-0.5 mt-1">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star
                            key={star}
                            className={cn(
                              "w-3.5 h-3.5",
                              star <= review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                            )}
                          />
                        ))}
                      </div>
                      {review.comment && (
                        <p className="text-sm text-muted-foreground mt-2">{review.comment}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!review.is_approved && (
                      <Button size="sm" variant="ghost" onClick={() => handleApprove(review.id)} className="text-green-600 hover:text-green-700 hover:bg-green-50">
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                    {review.is_approved && (
                      <Button size="sm" variant="ghost" onClick={() => handleReject(review.id)} className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50">
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(review.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            {t('কোনো রিভিউ নেই', 'No reviews found')}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
