import React, { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, Save } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  useProductSizes,
  useCreateProductSize,
  useUpdateProductSize,
  useDeleteProductSize,
  useBulkCreateProductSizes,
  SIZE_PRESETS,
  SizeFormData,
} from '@/hooks/useProductSizes';

interface ProductSizeManagerProps {
  productId: string;
  isWearable: boolean;
  onWearableChange: (isWearable: boolean) => void;
}

interface LocalSize extends SizeFormData {
  id?: string;
  isNew?: boolean;
}

export default function ProductSizeManager({
  productId,
  isWearable,
  onWearableChange,
}: ProductSizeManagerProps) {
  const { t } = useLanguage();
  const { data: existingSizes, isLoading } = useProductSizes(productId);
  const createSize = useCreateProductSize();
  const updateSize = useUpdateProductSize();
  const deleteSize = useDeleteProductSize();
  const bulkCreate = useBulkCreateProductSizes();

  const [sizes, setSizes] = useState<LocalSize[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (existingSizes) {
      setSizes(existingSizes.map(s => ({
        id: s.id,
        size_name: s.size_name,
        size_order: s.size_order,
        stock_quantity: s.stock_quantity,
        price_adjustment: Number(s.price_adjustment),
        measurements: s.measurements as Record<string, string>,
        is_available: s.is_available,
      })));
    }
  }, [existingSizes]);

  const handleAddSize = () => {
    setSizes([
      ...sizes,
      {
        size_name: '',
        size_order: sizes.length,
        stock_quantity: 0,
        price_adjustment: 0,
        measurements: {},
        is_available: true,
        isNew: true,
      },
    ]);
    setHasChanges(true);
  };

  const handleRemoveSize = async (index: number) => {
    const size = sizes[index];
    if (size.id) {
      try {
        await deleteSize.mutateAsync({ id: size.id, product_id: productId });
        toast.success(t('সাইজ ডিলিট হয়েছে', 'Size deleted'));
      } catch (error) {
        toast.error(t('ত্রুটি হয়েছে', 'Error occurred'));
        return;
      }
    }
    setSizes(sizes.filter((_, i) => i !== index));
  };

  const handleUpdateSize = (index: number, field: keyof LocalSize, value: any) => {
    const newSizes = [...sizes];
    newSizes[index] = { ...newSizes[index], [field]: value };
    setSizes(newSizes);
    setHasChanges(true);
  };

  const handleApplyPreset = (preset: 'clothing' | 'shoes' | 'kids') => {
    const presetSizes = SIZE_PRESETS[preset];
    const newSizes: LocalSize[] = presetSizes.map((name, index) => ({
      size_name: name,
      size_order: index,
      stock_quantity: 0,
      price_adjustment: 0,
      measurements: {},
      is_available: true,
      isNew: true,
    }));
    setSizes(newSizes);
    setHasChanges(true);
  };

  const handleSaveAll = async () => {
    if (!productId) {
      toast.error(t('প্রথমে পণ্য সেভ করুন', 'Save product first'));
      return;
    }

    try {
      // Update existing sizes
      for (const size of sizes.filter(s => s.id && !s.isNew)) {
        await updateSize.mutateAsync({
          id: size.id!,
          product_id: productId,
          size_name: size.size_name,
          size_order: size.size_order,
          stock_quantity: size.stock_quantity,
          price_adjustment: size.price_adjustment,
          measurements: size.measurements,
          is_available: size.is_available,
        });
      }

      // Create new sizes
      const newSizes = sizes.filter(s => s.isNew);
      if (newSizes.length > 0) {
        await bulkCreate.mutateAsync({
          product_id: productId,
          sizes: newSizes.map((s, index) => ({
            size_name: s.size_name,
            size_order: s.size_order || index,
            stock_quantity: s.stock_quantity,
            price_adjustment: s.price_adjustment,
            measurements: s.measurements,
            is_available: s.is_available,
          })),
        });
      }

      toast.success(t('সাইজ সেভ হয়েছে', 'Sizes saved'));
      setHasChanges(false);
    } catch (error) {
      toast.error(t('ত্রুটি হয়েছে', 'Error occurred'));
    }
  };

  return (
    <div className="space-y-4 border rounded-lg p-4 bg-secondary/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Switch
            checked={isWearable}
            onCheckedChange={onWearableChange}
            id="is-wearable"
          />
          <Label htmlFor="is-wearable" className="font-medium">
            {t('এটি একটি পোশাক/জুতা পণ্য', 'This is a wearable product')}
          </Label>
        </div>
      </div>

      {isWearable && (
        <>
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground">
              {t('দ্রুত প্রিসেট:', 'Quick Preset:')}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleApplyPreset('clothing')}
            >
              {t('পোশাক', 'Clothing')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleApplyPreset('shoes')}
            >
              {t('জুতা', 'Shoes')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleApplyPreset('kids')}
            >
              {t('বাচ্চা', 'Kids')}
            </Button>
          </div>

          <div className="space-y-2">
            {sizes.map((size, index) => (
              <div
                key={size.id || `new-${index}`}
                className="flex items-center gap-2 p-2 bg-background rounded-lg border"
              >
                <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                
                <Input
                  placeholder={t('সাইজ', 'Size')}
                  value={size.size_name}
                  onChange={(e) => handleUpdateSize(index, 'size_name', e.target.value)}
                  className="w-20"
                />
                
                <Input
                  type="number"
                  placeholder={t('স্টক', 'Stock')}
                  value={size.stock_quantity}
                  onChange={(e) => handleUpdateSize(index, 'stock_quantity', parseInt(e.target.value) || 0)}
                  className="w-20"
                  min={0}
                />
                
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">+৳</span>
                  <Input
                    type="number"
                    placeholder="0"
                    value={size.price_adjustment || ''}
                    onChange={(e) => handleUpdateSize(index, 'price_adjustment', parseFloat(e.target.value) || 0)}
                    className="w-20"
                    min={0}
                  />
                </div>

                <Switch
                  checked={size.is_available}
                  onCheckedChange={(checked) => handleUpdateSize(index, 'is_available', checked)}
                />

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveSize(index)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddSize}
            >
              <Plus className="w-4 h-4 mr-1" />
              {t('সাইজ যোগ করুন', 'Add Size')}
            </Button>

            {hasChanges && (
              <Button
                type="button"
                size="sm"
                onClick={handleSaveAll}
                disabled={createSize.isPending || updateSize.isPending}
              >
                <Save className="w-4 h-4 mr-1" />
                {t('সাইজ সেভ করুন', 'Save Sizes')}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
