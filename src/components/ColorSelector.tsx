import React from 'react';
import { Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { ProductColor } from '@/hooks/useProductColors';

interface ColorSelectorProps {
  colors: ProductColor[];
  selectedColor: string | null;
  onSelectColor: (color: ProductColor) => void;
  disabledColorIds?: string[];
}

export default function ColorSelector({
  colors,
  selectedColor,
  onSelectColor,
  disabledColorIds = [],
}: ColorSelectorProps) {
  const { t } = useLanguage();

  if (colors.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">
          {t('রঙ নির্বাচন করুন', 'Select Color')}:
        </span>
        {selectedColor && (
          <span className="text-sm text-muted-foreground">
            {colors.find(c => c.id === selectedColor)?.color_name}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {colors.map((color) => {
          const isDisabled = !color.is_available || disabledColorIds.includes(color.id);
          const isSelected = selectedColor === color.id;
          const isLight = isLightColor(color.color_code || '#000000');

          return (
            <button
              key={color.id}
              onClick={() => !isDisabled && onSelectColor(color)}
              disabled={isDisabled}
              className={cn(
                'relative w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center',
                isSelected
                  ? 'border-primary ring-2 ring-primary ring-offset-2'
                  : isDisabled
                  ? 'border-muted opacity-40 cursor-not-allowed'
                  : 'border-border hover:border-primary/50 hover:scale-110'
              )}
              style={{ backgroundColor: color.color_code || '#000000' }}
              title={color.color_name}
            >
              {isSelected && (
                <Check className={cn('w-5 h-5', isLight ? 'text-gray-900' : 'text-white')} />
              )}
              {isDisabled && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full h-0.5 bg-destructive rotate-45 absolute" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Helper to determine if a color is light
function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '');
  const rgb = parseInt(c, 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = (rgb >> 0) & 0xff;
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luma > 128;
}
