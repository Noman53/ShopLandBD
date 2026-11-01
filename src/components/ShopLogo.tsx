import React from 'react';
import { cn } from '@/lib/utils';
import logoImg from '@/assets/shopland-logo.png';

interface ShopLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showName?: boolean;
}

export default function ShopLogo({ size = 'md', className }: Omit<ShopLogoProps, 'showName'>) {
  const imgSize = {
    sm: 'h-10 md:h-12',
    md: 'h-12 md:h-14',
    lg: 'h-14 md:h-16',
  };

  return (
    <div className={cn("flex items-center", className)}>
      <img
        src={logoImg}
        alt="ShopLandBD"
        className={cn("w-auto object-contain drop-shadow-sm", imgSize[size])}
      />
    </div>
  );
}
