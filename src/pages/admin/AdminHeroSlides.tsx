import React, { useState, useRef, useCallback } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAllHeroSlides, useCreateHeroSlide, useUpdateHeroSlide, useDeleteHeroSlide, HeroSlide } from '@/hooks/useHeroSlides';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, GripVertical, Loader2, Image, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function AdminHeroSlides() {
  const { t } = useLanguage();
  const { data: slides, isLoading } = useAllHeroSlides();
  const createSlide = useCreateHeroSlide();
  const updateSlide = useUpdateHeroSlide();
  const deleteSlide = useDeleteHeroSlide();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);
  const [replacingSlideId, setReplacingSlideId] = useState<string | null>(null);

  // Drag state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const resizeImageTo1920x640 = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const canvas = document.createElement('canvas');
        canvas.width = 1920;
        canvas.height = 640;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas not supported'));
        const scale = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
        const width = img.naturalWidth * scale;
        const height = img.naturalHeight * scale;
        ctx.drawImage(img, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to create blob'));
          },
          'image/jpeg',
          0.82
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load image'));
      };
      img.src = objectUrl;
    });
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const resizedBlob = await resizeImageTo1920x640(file);
      const fileName = `hero-${Date.now()}.jpg`;
      const { error } = await supabase.storage.from('product-images').upload(`hero/${fileName}`, resizedBlob, {
        upsert: true,
        contentType: 'image/jpeg',
      });
      if (error) {
        toast.error(t('আপলোড ব্যর্থ', 'Upload failed'));
        return null;
      }
      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(`hero/${fileName}`);
      return urlData.publicUrl;
    } catch {
      toast.error(t('ইমেজ রিসাইজ ব্যর্থ', 'Image resize failed'));
      return null;
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(t('শুধু ইমেজ ফাইল আপলোড করুন', 'Please upload image files only'));
      return;
    }
    setPreviewUrl(URL.createObjectURL(file));
    setUploading(true);
    try {
      const url = await uploadImage(file);
      if (!url) return;
      const maxOrder = slides?.length ? Math.max(...slides.map(s => s.sort_order)) + 1 : 0;
      await createSlide.mutateAsync({ image_url: url, sort_order: maxOrder, is_active: true });
      toast.success(t('স্লাইড যোগ হয়েছে', 'Slide added'));
      setPreviewUrl('');
      setDialogOpen(false);
    } catch {
      toast.error(t('ত্রুটি হয়েছে', 'Error occurred'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleReplaceImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !replacingSlideId) return;
    if (!file.type.startsWith('image/')) {
      toast.error(t('শুধু ইমেজ ফাইল আপলোড করুন', 'Please upload image files only'));
      return;
    }
    setUploading(true);
    try {
      const url = await uploadImage(file);
      if (!url) return;
      await updateSlide.mutateAsync({ id: replacingSlideId, image_url: url });
      toast.success(t('ইমেজ আপডেট হয়েছে', 'Image updated'));
    } catch {
      toast.error(t('ত্রুটি হয়েছে', 'Error occurred'));
    } finally {
      setUploading(false);
      setReplacingSlideId(null);
      if (replaceFileInputRef.current) replaceFileInputRef.current.value = '';
    }
  };

  const handleToggleActive = async (slide: HeroSlide) => {
    try {
      await updateSlide.mutateAsync({ id: slide.id, is_active: !slide.is_active });
      toast.success(t('আপডেট হয়েছে', 'Updated'));
    } catch {
      toast.error(t('ত্রুটি হয়েছে', 'Error occurred'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('আপনি কি নিশ্চিত?', 'Are you sure?'))) return;
    try {
      await deleteSlide.mutateAsync(id);
      toast.success(t('স্লাইড মুছে ফেলা হয়েছে', 'Slide deleted'));
    } catch {
      toast.error(t('ত্রুটি হয়েছে', 'Error occurred'));
    }
  };

  // Drag and drop handlers
  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  }, []);

  const handleDragEnd = useCallback(async () => {
    if (dragIndex === null || dragOverIndex === null || dragIndex === dragOverIndex || !slides) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const reordered = [...slides];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dragOverIndex, 0, moved);

    // Update sort_order for all affected slides
    try {
      await Promise.all(
        reordered.map((slide, i) =>
          slide.sort_order !== i ? updateSlide.mutateAsync({ id: slide.id, sort_order: i }) : Promise.resolve()
        )
      );
      toast.success(t('ক্রম আপডেট হয়েছে', 'Order updated'));
    } catch {
      toast.error(t('ত্রুটি হয়েছে', 'Error occurred'));
    }
    setDragIndex(null);
    setDragOverIndex(null);
  }, [dragIndex, dragOverIndex, slides, updateSlide, t]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('হিরো স্লাইডার', 'Hero Slider')}</h1>
            <p className="text-muted-foreground text-sm">
              {t('হোমপেজের ব্যানার স্লাইড ম্যানেজ করুন। টেনে সাজান।', 'Manage homepage banner slides. Drag to reorder.')}
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
              📐 {t(
                'সেরা ফলাফলের জন্য 1920×640 পিক্সেলের landscape ছবি দিন। আপলোডের সময় ছবিটি স্বয়ংক্রিয়ভাবে অপ্টিমাইজ হবে; গুরুত্বপূর্ণ বিষয় মাঝখানে রাখুন।',
                'Upload landscape images at 1920×640 pixels for best results. Images are optimized on upload; keep important content near the center.'
              )}
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                {t('স্লাইড যোগ করুন', 'Add Slide')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('নতুন স্লাইড', 'New Slide')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div
                  className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-accent/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {previewUrl ? (
                    <div className="rounded-lg overflow-hidden aspect-video">
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Upload className="w-10 h-10" />
                      <p className="font-medium">{t('ক্লিক করে ইমেজ আপলোড করুন', 'Click to upload image')}</p>
                      <p className="text-xs">{t('JPG, PNG, WebP সাপোর্টেড', 'JPG, PNG, WebP supported')}</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                {uploading && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('আপলোড হচ্ছে...', 'Uploading...')}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Hidden file input for replacing images */}
        <input
          ref={replaceFileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleReplaceImage}
        />

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !slides?.length ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Image className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-1">{t('কোনো স্লাইড নেই', 'No Slides Yet')}</h3>
              <p className="text-muted-foreground text-sm mb-4">
                {t('হোমপেজে ব্যানার দেখাতে স্লাইড যোগ করুন', 'Add slides to show banners on the homepage')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {slides.map((slide, index) => (
              <Card
                key={slide.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`transition-all ${!slide.is_active ? 'opacity-60' : ''} ${
                  dragOverIndex === index ? 'border-primary ring-2 ring-primary/20' : ''
                } ${dragIndex === index ? 'opacity-40 scale-[0.98]' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="cursor-grab active:cursor-grabbing flex-shrink-0">
                      <GripVertical className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="w-40 h-24 md:w-56 md:h-32 rounded-lg overflow-hidden border flex-shrink-0 bg-muted">
                      <img src={slide.image_url} alt={`Slide ${index + 1}`} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Switch checked={slide.is_active} onCheckedChange={() => handleToggleActive(slide)} />
                          <Label className="text-sm">{t('সক্রিয়', 'Active')}</Label>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {t('ক্রম', 'Order')}: {index + 1}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setReplacingSlideId(slide.id);
                          replaceFileInputRef.current?.click();
                        }}
                        disabled={uploading}
                      >
                        <Upload className="w-3 h-3 mr-1.5" />
                        {t('ইমেজ বদলান', 'Replace Image')}
                      </Button>
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive flex-shrink-0" onClick={() => handleDelete(slide.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
