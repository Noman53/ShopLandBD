import React from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWishlist } from '@/contexts/WishlistContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface WishlistButtonProps {
  productId: string;
  productName?: string;
  variant?: 'icon' | 'default';
  size?: 'sm' | 'default' | 'lg' | 'icon';
  className?: string;
}

export default function WishlistButton({
  productId,
  productName,
  variant = 'icon',
  size = 'icon',
  className,
}: WishlistButtonProps) {
  const { toggleItem, isInWishlist } = useWishlist();
  const { t } = useLanguage();
  const { toast } = useToast();

  const isWishlisted = isInWishlist(productId);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    toggleItem(productId);
    
    toast({
      title: isWishlisted
        ? t('উইশলিস্ট থেকে সরানো হয়েছে', 'Removed from wishlist')
        : t('উইশলিস্টে যোগ করা হয়েছে', 'Added to wishlist'),
      description: productName,
    });
  };

  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size={size}
        onClick={handleClick}
        className={cn(
          "hover:bg-background/80",
          className
        )}
      >
        <Heart
          className={cn(
            "w-5 h-5 transition-all",
            isWishlisted ? "fill-destructive text-destructive" : "text-muted-foreground"
          )}
        />
      </Button>
    );
  }

  return (
    <Button
      variant={isWishlisted ? "secondary" : "outline"}
      size={size}
      onClick={handleClick}
      className={className}
    >
      <Heart
        className={cn(
          "w-4 h-4 mr-2",
          isWishlisted && "fill-current"
        )}
      />
      {isWishlisted
        ? t('উইশলিস্টে আছে', 'In Wishlist')
        : t('উইশলিস্টে রাখুন', 'Add to Wishlist')}
    </Button>
  );
}
