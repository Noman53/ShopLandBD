import React, { useState } from 'react';
import { Star, MessageSquare, Send } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useProductReviews, useUserReview, useSubmitReview, useProductRatingStats } from '@/hooks/useProductReviews';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import UserAvatar from './UserAvatar';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface ProductReviewsProps {
  productId: string;
}

function StarRating({ rating, onRate, interactive = false, size = 'md' }: {
  rating: number;
  onRate?: (rating: number) => void;
  interactive?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [hoverRating, setHoverRating] = useState(0);
  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onRate?.(star)}
          onMouseEnter={() => interactive && setHoverRating(star)}
          onMouseLeave={() => interactive && setHoverRating(0)}
          className={cn(
            "transition-colors",
            interactive && "cursor-pointer hover:scale-110"
          )}
        >
          <Star
            className={cn(
              sizeClass,
              (hoverRating || rating) >= star
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/30"
            )}
          />
        </button>
      ))}
    </div>
  );
}

export { StarRating };

export default function ProductReviews({ productId }: ProductReviewsProps) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: reviews, isLoading } = useProductReviews(productId);
  const { data: userReview } = useUserReview(productId);
  const { data: stats } = useProductRatingStats(productId);
  const submitReview = useSubmitReview();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Pre-fill form with existing review
  React.useEffect(() => {
    if (userReview) {
      setRating(userReview.rating);
      setComment(userReview.comment || '');
    }
  }, [userReview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast({ title: t('রেটিং দিন', 'Please rate'), variant: 'destructive' });
      return;
    }

    try {
      const result = await submitReview.mutateAsync({ productId, rating, comment });
      const isAutoApproved = result?.is_approved;
      toast({
        title: t('রিভিউ জমা হয়েছে', 'Review submitted'),
        description: isAutoApproved
          ? t('আপনার রিভিউ প্রকাশিত হয়েছে', 'Your review has been published')
          : t('আপনার রিভিউ অনুমোদনের পর দেখা যাবে', 'Your review will be visible after approval'),
      });
      setShowForm(false);
    } catch (error: any) {
      toast({ title: t('ত্রুটি হয়েছে', 'Error'), description: error.message, variant: 'destructive' });
    }
  };

  const approvedReviews = reviews?.filter(r => r.is_approved) || [];

  return (
    <div className="border-t border-border pt-6 mt-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          {t('রিভিউ ও রেটিং', 'Reviews & Ratings')}
        </h3>
      </div>

      {/* Rating Summary */}
      {stats && stats.count > 0 && (
        <div className="flex items-center gap-6 mb-6 p-4 bg-secondary/30 rounded-xl">
          <div className="text-center">
            <p className="text-3xl font-bold text-primary">{stats.average.toFixed(1)}</p>
            <StarRating rating={Math.round(stats.average)} size="sm" />
            <p className="text-xs text-muted-foreground mt-1">
              {stats.count} {t('টি রিভিউ', 'reviews')}
            </p>
          </div>
          <div className="flex-1 space-y-1">
            {[5, 4, 3, 2, 1].map((star) => (
              <div key={star} className="flex items-center gap-2">
                <span className="text-xs w-3">{star}</span>
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all"
                    style={{ width: `${stats.count > 0 ? (stats.distribution[star - 1] / stats.count) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-6">{stats.distribution[star - 1]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Write Review */}
      {user ? (
        <div className="mb-6">
          {!showForm ? (
            <Button variant="outline" onClick={() => setShowForm(true)} className="w-full">
              <Star className="w-4 h-4 mr-2" />
              {userReview ? t('রিভিউ সম্পাদনা করুন', 'Edit Your Review') : t('রিভিউ লিখুন', 'Write a Review')}
            </Button>
          ) : (
            <form onSubmit={handleSubmit} className="p-4 bg-secondary/30 rounded-xl space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">{t('আপনার রেটিং', 'Your Rating')}</p>
                <StarRating rating={rating} onRate={setRating} interactive size="lg" />
              </div>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t('আপনার মতামত লিখুন...', 'Write your review...')}
                rows={3}
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={submitReview.isPending} size="sm">
                  <Send className="w-4 h-4 mr-2" />
                  {submitReview.isPending ? t('জমা হচ্ছে...', 'Submitting...') : t('জমা দিন', 'Submit')}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                  {t('বাতিল', 'Cancel')}
                </Button>
              </div>
            </form>
          )}
          {userReview && !userReview.is_approved && !showForm && (
            <p className="text-xs text-muted-foreground mt-2">
              ⏳ {t('আপনার রিভিউ অনুমোদনের অপেক্ষায়', 'Your review is pending approval')}
            </p>
          )}
        </div>
      ) : (
        <div className="mb-6 p-4 bg-secondary/30 rounded-xl text-center">
          <p className="text-sm text-muted-foreground mb-2">
            {t('রিভিউ দিতে লগইন করুন', 'Login to write a review')}
          </p>
          <Link to="/login">
            <Button variant="outline" size="sm">{t('লগইন', 'Login')}</Button>
          </Link>
        </div>
      )}

      {/* Reviews List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : approvedReviews.length > 0 ? (
        <div className="space-y-4">
          {approvedReviews.map((review) => (
            <div key={review.id} className="p-4 bg-card border border-border/50 rounded-xl">
              <div className="flex items-start gap-3">
                <UserAvatar
                  name={review.profiles?.name || null}
                  avatarUrl={review.profiles?.avatar_url || null}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">
                      {review.profiles?.name || t('অজানা ব্যবহারকারী', 'Anonymous User')}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(review.created_at, language)}
                    </span>
                  </div>
                  <StarRating rating={review.rating} size="sm" />
                  {review.comment && (
                    <p className="text-sm text-muted-foreground mt-2">{review.comment}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground py-6">
          {t('এখনো কোনো রিভিউ নেই', 'No reviews yet')}
        </p>
      )}
    </div>
  );
}
