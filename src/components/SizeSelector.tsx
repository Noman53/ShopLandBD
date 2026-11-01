import React, { useState } from 'react';
import { Info, Ruler } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { ProductSize, SIZE_MEASUREMENTS } from '@/hooks/useProductSizes';
import { formatPrice } from '@/lib/formatters';

interface SizeSelectorProps {
  sizes: ProductSize[];
  selectedSize: string | null;
  onSelectSize: (size: ProductSize) => void;
  productType?: 'clothing' | 'shoes';
  sizeChartImage?: string | null;
}

export default function SizeSelector({
  sizes,
  selectedSize,
  onSelectSize,
  productType = 'clothing',
  sizeChartImage,
}: SizeSelectorProps) {
  const { t, language } = useLanguage();
  const [showSizeChart, setShowSizeChart] = useState(false);

  const availableSizes = sizes.filter(s => s.is_available && s.stock_quantity > 0);

  if (sizes.length === 0) return null;

  const getMeasurements = () => {
    return SIZE_MEASUREMENTS[productType] || SIZE_MEASUREMENTS.clothing;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">
          {t('সাইজ নির্বাচন করুন', 'Select Size')}:
        </span>
        <Dialog open={showSizeChart} onOpenChange={setShowSizeChart}>
          <DialogTrigger asChild>
            <Button variant="link" size="sm" className="h-auto p-0 text-primary">
              <Ruler className="w-4 h-4 mr-1" />
              {t('সাইজ চার্ট', 'Size Chart')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {t('সাইজ চার্ট', 'Size Chart')}
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              {/* Admin uploaded size chart image */}
              {sizeChartImage ? (
                <img 
                  src={sizeChartImage} 
                  alt={t('সাইজ চার্ট', 'Size Chart')}
                  className="w-full h-auto rounded-lg"
                />
              ) : (
                /* Default table-based size chart */
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2 font-medium">
                        {t('সাইজ', 'Size')}
                      </th>
                      {productType === 'shoes' ? (
                        <>
                          <th className="text-center py-2 px-2 font-medium">EU</th>
                          <th className="text-center py-2 px-2 font-medium">UK</th>
                          <th className="text-center py-2 px-2 font-medium">US</th>
                          <th className="text-center py-2 px-2 font-medium">CM</th>
                        </>
                      ) : (
                        <>
                          <th className="text-center py-2 px-2 font-medium">
                            {t('বুক', 'Chest')}
                          </th>
                          <th className="text-center py-2 px-2 font-medium">
                            {t('কোমর', 'Waist')}
                          </th>
                          <th className="text-center py-2 px-2 font-medium">
                            {t('হিপ', 'Hips')}
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {sizes.map((size) => {
                      const measurements = size.measurements && Object.keys(size.measurements).length > 0
                        ? size.measurements
                        : (getMeasurements() as Record<string, Record<string, string>>)[size.size_name];
                      
                      return (
                        <tr key={size.id} className="border-b last:border-0">
                          <td className="py-2 px-2 font-medium">{size.size_name}</td>
                          {productType === 'shoes' ? (
                            <>
                              <td className="text-center py-2 px-2">{measurements?.eu || '-'}</td>
                              <td className="text-center py-2 px-2">{measurements?.uk || '-'}</td>
                              <td className="text-center py-2 px-2">{measurements?.us || '-'}</td>
                              <td className="text-center py-2 px-2">{measurements?.cm || '-'}</td>
                            </>
                          ) : (
                            <>
                              <td className="text-center py-2 px-2">{measurements?.chest || '-'}</td>
                              <td className="text-center py-2 px-2">{measurements?.waist || '-'}</td>
                              <td className="text-center py-2 px-2">{measurements?.hips || '-'}</td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-2">
        {sizes.map((size) => {
          const isOutOfStock = !size.is_available || size.stock_quantity <= 0;
          const isSelected = selectedSize === size.id;

          return (
            <button
              key={size.id}
              onClick={() => !isOutOfStock && onSelectSize(size)}
              disabled={isOutOfStock}
              className={cn(
                'relative min-w-[48px] px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all',
                isSelected
                  ? 'border-primary bg-primary text-primary-foreground'
                  : isOutOfStock
                  ? 'border-muted bg-muted/50 text-muted-foreground cursor-not-allowed line-through'
                  : 'border-border hover:border-primary/50 hover:bg-primary/5'
              )}
            >
              {size.size_name}
              {Number(size.price_adjustment) > 0 && !isOutOfStock && (
                <span className="block text-xs opacity-75">
                  +{formatPrice(Number(size.price_adjustment), language)}
                </span>
              )}
              {isOutOfStock && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {selectedSize && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Info className="w-3 h-3" />
          {t(
            `${availableSizes.find(s => s.id === selectedSize)?.stock_quantity || 0} টি স্টকে আছে`,
            `${availableSizes.find(s => s.id === selectedSize)?.stock_quantity || 0} in stock`
          )}
        </div>
      )}
    </div>
  );
}
