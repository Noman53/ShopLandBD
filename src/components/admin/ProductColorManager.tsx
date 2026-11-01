import React, { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, Save, Palette } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import {
  useProductColors,
  useDeleteProductColor,
  COLOR_PRESETS,
  ColorFormData,
} from '@/hooks/useProductColors';

interface ProductColorManagerProps {
  productId: string;
  hasColorVariants: boolean;
  isWearable: boolean;
  onColorVariantsChange: (hasColors: boolean) => void;
}

interface LocalColor extends ColorFormData {
  id?: string;
  isNew?: boolean;
  stock_quantity: number;
}

export default function ProductColorManager({
  productId,
  hasColorVariants,
  isWearable,
  onColorVariantsChange,
}: ProductColorManagerProps) {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const { data: existingColors, isLoading } = useProductColors(productId);
  const deleteColor = useDeleteProductColor();

  const [colors, setColors] = useState<LocalColor[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [customColorCode, setCustomColorCode] = useState('#000000');
  const [customColorName, setCustomColorName] = useState('');

  // Whether we should manage stock per color (color-only products, not wearable)
  const showColorStock = hasColorVariants && !isWearable;

  useEffect(() => {
    if (!existingColors) return;

    const loadColorStock = async () => {
      // For color-only products, load stock from product_sizes with size_name='Default'
      let stockMap = new Map<string, number>();
      if (showColorStock) {
        const { data: sizeRows } = await supabase
          .from('product_sizes')
          .select('color_id, stock_quantity')
          .eq('product_id', productId)
          .eq('size_name', 'Default');
        
        if (sizeRows) {
          for (const row of sizeRows) {
            if (row.color_id) {
              stockMap.set(row.color_id, row.stock_quantity);
            }
          }
        }
      }

      setColors(existingColors.map(c => ({
        id: c.id,
        color_name: c.color_name,
        color_code: c.color_code,
        color_order: c.color_order,
        is_available: c.is_available,
        stock_quantity: stockMap.get(c.id) ?? 0,
      })));
    };

    loadColorStock();
  }, [existingColors, showColorStock, productId]);

  const handleAddColor = () => {
    setColors([
      ...colors,
      {
        color_name: '',
        color_code: '#000000',
        color_order: colors.length,
        is_available: true,
        isNew: true,
        stock_quantity: 0,
      },
    ]);
    setHasChanges(true);
  };

  const handleAddCustomColor = () => {
    setColors([
      ...colors,
      {
        color_name: customColorName.trim(),
        color_code: customColorCode,
        color_order: colors.length,
        is_available: true,
        isNew: true,
        stock_quantity: 0,
      },
    ]);
    setCustomColorName('');
    setHasChanges(true);
  };

  const handleRemoveColor = async (index: number) => {
    const color = colors[index];
    if (color.id) {
      try {
        // Delete associated product_sizes entries first (for color-only products)
        if (showColorStock) {
          await supabase
            .from('product_sizes')
            .delete()
            .eq('product_id', productId)
            .eq('color_id', color.id)
            .eq('size_name', 'Default');
        }
        await deleteColor.mutateAsync({ id: color.id, product_id: productId });
        toast.success(t('রঙ ডিলিট হয়েছে', 'Color deleted'));
      } catch (error) {
        toast.error(t('ত্রুটি হয়েছে', 'Error occurred'));
        return;
      }
    }
    setColors(colors.filter((_, i) => i !== index));
    // Invalidate variant-stock queries so storefront updates
    queryClient.invalidateQueries({ queryKey: ['variant-stock'] });
    queryClient.invalidateQueries({ queryKey: ['product-sizes'] });
  };

  const handleUpdateColor = (index: number, field: keyof LocalColor, value: any) => {
    const newColors = [...colors];
    newColors[index] = { ...newColors[index], [field]: value };
    setColors(newColors);
    setHasChanges(true);
  };

  const handleApplyPreset = (preset: typeof COLOR_PRESETS[0]) => {
    setColors([
      ...colors,
      {
        color_name: language === 'bn' ? preset.name_bn : preset.name_en,
        color_code: preset.code,
        color_order: colors.length,
        is_available: true,
        isNew: true,
        stock_quantity: 0,
      },
    ]);
    setHasChanges(true);
  };

  /**
   * Sync product_sizes entries for color-only products.
   * Each color gets a "Default" size entry with per-color stock.
   */
  const syncColorStockEntries = async (savedColorIds: Map<string, { id: string; stock: number; is_available: boolean }>) => {
    if (!showColorStock) return;

    // Fetch existing Default size entries for this product
    const { data: existingEntries, error: fetchError } = await supabase
      .from('product_sizes')
      .select('id, color_id')
      .eq('product_id', productId)
      .eq('size_name', 'Default');

    if (fetchError) {
      console.error('Failed to fetch existing color stock entries:', fetchError);
      throw new Error('Failed to sync color stock');
    }

    const existingByColorId = new Map<string, string>();
    for (const entry of existingEntries ?? []) {
      if (entry.color_id) {
        existingByColorId.set(entry.color_id, entry.id);
      }
    }

    // Upsert: update existing, create new
    for (const [colorId, info] of savedColorIds) {
      const existingId = existingByColorId.get(colorId);
      if (existingId) {
        const { error: updateError } = await supabase
          .from('product_sizes')
          .update({
            stock_quantity: info.stock,
            is_available: info.is_available,
          })
          .eq('id', existingId);

        if (updateError) {
          console.error('Failed to update color stock entry:', updateError);
          throw new Error('Failed to update color stock');
        }
      } else {
        const { error: insertError } = await supabase
          .from('product_sizes')
          .insert({
            product_id: productId,
            color_id: colorId,
            size_name: 'Default',
            size_order: 0,
            stock_quantity: info.stock,
            is_available: info.is_available,
            price_adjustment: 0,
          });

        if (insertError) {
          console.error('Failed to insert color stock entry:', insertError);
          throw new Error('Failed to create color stock entry');
        }
      }
      existingByColorId.delete(colorId);
    }

    // Delete orphaned entries (colors that no longer exist)
    for (const [, sizeId] of existingByColorId) {
      const { error: deleteError } = await supabase.from('product_sizes').delete().eq('id', sizeId);
      if (deleteError) {
        console.error('Failed to delete orphaned color stock entry:', deleteError);
      }
    }
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSaveAll = async () => {
    if (!productId) {
      toast.error(t('প্রথমে পণ্য সেভ করুন', 'Save product first'));
      return;
    }

    setIsSaving(true);

    // Snapshot the current colors state to avoid stale reads during async operations
    const colorsSnapshot = [...colors];

    try {
      // 1. Update existing colors directly via supabase (NOT mutations, to avoid mid-loop invalidation)
      const existingColors = colorsSnapshot.filter(c => c.id && !c.isNew);
      for (const color of existingColors) {
        const { error } = await supabase
          .from('product_colors')
          .update({
            color_name: color.color_name,
            color_code: color.color_code,
            color_order: color.color_order,
            is_available: color.is_available,
          })
          .eq('id', color.id!);

        if (error) {
          console.error('Failed to update color:', color.id, error);
          throw new Error(`Failed to update color: ${color.color_name}`);
        }
      }

      // 2. Create new colors directly via supabase
      const newColors = colorsSnapshot.filter(c => c.isNew);
      if (newColors.length > 0) {
        const colorsToInsert = newColors.map((c, index) => ({
          product_id: productId,
          color_name: c.color_name,
          color_code: c.color_code,
          color_order: c.color_order || index,
          is_available: c.is_available,
        }));

        const { error } = await supabase
          .from('product_colors')
          .insert(colorsToInsert);

        if (error) {
          console.error('Failed to create new colors:', error);
          throw new Error('Failed to create new colors');
        }
      }

      // 3. Re-fetch all colors to get IDs (especially for newly created ones)
      const { data: allColors, error: fetchError } = await supabase
        .from('product_colors')
        .select('id, color_name, color_code, is_available')
        .eq('product_id', productId)
        .order('color_order');

      if (fetchError) {
        console.error('Failed to re-fetch colors:', fetchError);
        throw new Error('Failed to re-fetch colors after save');
      }

      // 4. Sync stock entries for color-only products using the snapshot
      if (allColors && showColorStock) {
        const savedColorIds = new Map<string, { id: string; stock: number; is_available: boolean }>();
        
        for (const dbColor of allColors) {
          // Match by ID first, then by name+code for newly created colors
          const localMatch = colorsSnapshot.find(
            c => (c.id === dbColor.id) || 
                 (!c.id && c.color_name === dbColor.color_name && c.color_code === dbColor.color_code)
          );
          savedColorIds.set(dbColor.id, {
            id: dbColor.id,
            stock: localMatch?.stock_quantity ?? 0,
            is_available: dbColor.is_available,
          });
        }

        await syncColorStockEntries(savedColorIds);
      }

      // 5. Invalidate all related queries ONCE at the end
      queryClient.invalidateQueries({ queryKey: ['product-colors', productId] });
      queryClient.invalidateQueries({ queryKey: ['variant-stock'] });
      queryClient.invalidateQueries({ queryKey: ['product-sizes'] });

      toast.success(t('রঙ সেভ হয়েছে', 'Colors saved'));
      setHasChanges(false);
    } catch (error: any) {
      console.error('Save colors error:', error);
      toast.error(error?.message || t('ত্রুটি হয়েছে', 'Error occurred'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 border rounded-lg p-4 bg-secondary/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Switch
            checked={hasColorVariants}
            onCheckedChange={onColorVariantsChange}
            id="has-color-variants"
          />
          <Label htmlFor="has-color-variants" className="font-medium flex items-center gap-2">
            <Palette className="w-4 h-4" />
            {t('রঙের বৈচিত্র্য সক্রিয় করুন', 'Enable Color Variants')}
          </Label>
        </div>
      </div>

      {hasColorVariants && (
        <>
          {showColorStock && (
            <p className="text-xs text-muted-foreground bg-primary/5 p-2 rounded">
              {t(
                'প্রতিটি রঙের জন্য আলাদা স্টক সেট করুন। মোট স্টক স্বয়ংক্রিয়ভাবে গণনা হবে।',
                'Set stock per color. Total stock will be calculated automatically.'
              )}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground w-full mb-1">
              {t('জনপ্রিয় রঙ:', 'Popular Colors:')}
            </span>
            {COLOR_PRESETS.slice(0, 8).map((preset) => (
              <button
                key={preset.code}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className="w-8 h-8 rounded-full border-2 border-border hover:border-primary transition-colors"
                style={{ backgroundColor: preset.code }}
                title={language === 'bn' ? preset.name_bn : preset.name_en}
              />
            ))}
          </div>

          {/* Custom color picker */}
          <div className="grid grid-cols-1 md:grid-cols-[auto,1fr,auto] gap-2 items-end">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={customColorCode}
                onChange={(e) => setCustomColorCode(e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer border-0"
                aria-label={t('কাস্টম রঙ বাছাই', 'Pick custom color')}
              />
              <span className="text-sm text-muted-foreground">
                {t('কাস্টম', 'Custom')}
              </span>
            </div>
            <Input
              placeholder={t('রঙের নাম (ঐচ্ছিক)', 'Color name (optional)')}
              value={customColorName}
              onChange={(e) => setCustomColorName(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddCustomColor}
            >
              <Plus className="w-4 h-4 mr-1" />
              {t('যোগ করুন', 'Add')}
            </Button>
          </div>

          <div className="space-y-2">
            {colors.map((color, index) => (
              <div
                key={color.id || `new-${index}`}
                className="flex items-center gap-2 p-2 bg-background rounded-lg border"
              >
                <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                
                <input
                  type="color"
                  value={color.color_code || '#000000'}
                  onChange={(e) => handleUpdateColor(index, 'color_code', e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border-0"
                />
                
                <Input
                  placeholder={t('রঙের নাম', 'Color Name')}
                  value={color.color_name}
                  onChange={(e) => handleUpdateColor(index, 'color_name', e.target.value)}
                  className="flex-1"
                />

                {/* Stock input for color-only products */}
                {showColorStock && (
                  <Input
                    type="number"
                    placeholder={t('স্টক', 'Stock')}
                    value={color.stock_quantity}
                    onChange={(e) => handleUpdateColor(index, 'stock_quantity', parseInt(e.target.value) || 0)}
                    className="w-20"
                    min={0}
                  />
                )}

                <Switch
                  checked={color.is_available}
                  onCheckedChange={(checked) => handleUpdateColor(index, 'is_available', checked)}
                />

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveColor(index)}
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
              onClick={handleAddColor}
            >
              <Plus className="w-4 h-4 mr-1" />
              {t('রঙ যোগ করুন', 'Add Color')}
            </Button>

            {hasChanges && (
              <Button
                type="button"
                size="sm"
                onClick={handleSaveAll}
                disabled={isSaving}
              >
                <Save className="w-4 h-4 mr-1" />
                {isSaving ? t('সেভ হচ্ছে...', 'Saving...') : t('রঙ সেভ করুন', 'Save Colors')}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
