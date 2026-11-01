import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, ImageIcon, Upload, CheckSquare, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCategories } from '@/hooks/useProducts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CategoryFormData {
  name_bn: string;
  name_en: string;
  slug: string;
  image_url: string;
  sort_order: string;
  is_active: boolean;
}

const emptyCategory: CategoryFormData = {
  name_bn: '',
  name_en: '',
  slug: '',
  image_url: '',
  sort_order: '0',
  is_active: true,
};

export default function AdminCategories() {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const { data: categories, isLoading, refetch } = useCategories();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>(emptyCategory);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('admin-categories-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        refetch();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetch]);

  const createCategory = useMutation({
    mutationFn: async (data: Omit<CategoryFormData, 'sort_order'> & { sort_order: number }) => {
      const { error } = await supabase.from('categories').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name_bn?: string; name_en?: string; slug?: string; image_url?: string | null; sort_order?: number; is_active?: boolean }) => {
      const { error } = await supabase.from('categories').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      // Soft delete - set deleted_at timestamp
      const { error } = await supabase.from('categories').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['deleted-categories'] });
    },
  });

  // Bulk selection handlers
  const toggleCategorySelection = (id: string) => {
    const newSelected = new Set(selectedCategories);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedCategories(newSelected);
  };

  const toggleSelectAll = () => {
    if (categories && selectedCategories.size === categories.length) {
      setSelectedCategories(new Set());
    } else if (categories) {
      setSelectedCategories(new Set(categories.map(c => c.id)));
    }
  };

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedCategories.size === 0) {
      toast.error(t('ক্যাটাগরি সিলেক্ট করুন', 'Select categories first'));
      return;
    }

    if (action === 'delete') {
      setBulkDeleteIds(Array.from(selectedCategories));
      return;
    }

    setIsBulkUpdating(true);
    try {
      for (const id of selectedCategories) {
        await updateCategory.mutateAsync({ id, is_active: action === 'activate' });
      }
      toast.success(t(`${selectedCategories.size}টি ক্যাটাগরি আপডেট হয়েছে`, `${selectedCategories.size} categories updated`));
      setSelectedCategories(new Set());
    } catch (error) {
      toast.error(t('ত্রুটি হয়েছে', 'Error occurred'));
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleBulkDelete = async () => {
    if (bulkDeleteIds.length === 0) return;

    try {
      for (const id of bulkDeleteIds) {
        await deleteCategory.mutateAsync(id);
      }
      toast.success(
        t(
          `${bulkDeleteIds.length}টি ক্যাটাগরি রিসাইকেল বিনে পাঠানো হয়েছে`,
          `${bulkDeleteIds.length} categories moved to Recycle Bin`
        )
      );
      setBulkDeleteIds([]);
      setSelectedCategories(new Set());
    } catch (error) {
      toast.error(t('ত্রুটি হয়েছে', 'Error occurred'));
    }
  };

  const handleEdit = (category: NonNullable<typeof categories>[number]) => {
    setEditingId(category.id);
    setFormData({
      name_bn: category.name_bn,
      name_en: category.name_en,
      slug: category.slug,
      image_url: category.image_url || '',
      sort_order: String(category.sort_order || 0),
      is_active: category.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingId(null);
    setFormData(emptyCategory);
    setIsDialogOpen(true);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error(t('শুধুমাত্র ছবি আপলোড করুন', 'Please upload only images'));
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t('ছবির সাইজ ২MB এর বেশি হতে পারবে না', 'Image size should not exceed 2MB'));
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `category-${Date.now()}.${fileExt}`;
      const filePath = `categories/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      setFormData({ ...formData, image_url: publicUrl.publicUrl });
      toast.success(t('ছবি আপলোড হয়েছে', 'Image uploaded'));
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(t('ছবি আপলোড ব্যর্থ হয়েছে', 'Image upload failed'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name_bn || !formData.name_en || !formData.slug) {
      toast.error(t('সব প্রয়োজনীয় ফিল্ড পূরণ করুন', 'Please fill all required fields'));
      return;
    }

    try {
      const categoryData = {
        name_bn: formData.name_bn,
        name_en: formData.name_en,
        slug: formData.slug,
        image_url: formData.image_url || null,
        sort_order: parseInt(formData.sort_order) || 0,
        is_active: formData.is_active,
      };

      if (editingId) {
        await updateCategory.mutateAsync({ 
          id: editingId, 
          name_bn: categoryData.name_bn,
          name_en: categoryData.name_en,
          slug: categoryData.slug,
          image_url: categoryData.image_url,
          sort_order: categoryData.sort_order,
          is_active: categoryData.is_active,
        });
        toast.success(t('ক্যাটাগরি আপডেট হয়েছে', 'Category updated'));
      } else {
        await createCategory.mutateAsync(categoryData);
        toast.success(t('ক্যাটাগরি তৈরি হয়েছে', 'Category created'));
      }

      setIsDialogOpen(false);
    } catch (error) {
      console.error('Category error:', error);
      toast.error(t('ত্রুটি হয়েছে', 'Error occurred'));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await deleteCategory.mutateAsync(deleteId);
      toast.success(t('ক্যাটাগরিটি রিসাইকেল বিনে পাঠানো হয়েছে', 'Category moved to Recycle Bin'));
      setDeleteId(null);
    } catch (error) {
      toast.error(t('ত্রুটি হয়েছে', 'Error occurred'));
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await updateCategory.mutateAsync({ id, is_active: !isActive });
      toast.success(t('স্ট্যাটাস আপডেট হয়েছে', 'Status updated'));
    } catch (error) {
      toast.error(t('ত্রুটি হয়েছে', 'Error occurred'));
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {t('ক্যাটাগরি সমূহ', 'Categories')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t('ক্যাটাগরি যোগ করুন এবং ম্যানেজ করুন', 'Add and manage categories')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {selectedCategories.size > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" disabled={isBulkUpdating}>
                    {isBulkUpdating ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckSquare className="w-4 h-4 mr-2" />
                    )}
                    {t('বাল্ক অ্যাকশন', 'Bulk Actions')} ({selectedCategories.size})
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleBulkAction('activate')}>
                    <Eye className="w-4 h-4 mr-2" />
                    {t('সক্রিয় করুন', 'Activate')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkAction('deactivate')}>
                    <EyeOff className="w-4 h-4 mr-2" />
                    {t('নিষ্ক্রিয় করুন', 'Deactivate')}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleBulkAction('delete')}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t('ডিলিট করুন', 'Delete')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              {t('নতুন ক্যাটাগরি', 'New Category')}
            </Button>
          </div>
        </div>

        {/* Categories Table */}
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="w-12 p-4">
                    <Checkbox
                      checked={categories?.length ? selectedCategories.size === categories.length : false}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="text-left p-4 text-sm font-medium">{t('ক্যাটাগরি', 'Category')}</th>
                  <th className="text-left p-4 text-sm font-medium">{t('স্লাগ', 'Slug')}</th>
                  <th className="text-left p-4 text-sm font-medium">{t('অর্ডার', 'Order')}</th>
                  <th className="text-left p-4 text-sm font-medium">{t('স্ট্যাটাস', 'Status')}</th>
                  <th className="text-left p-4 text-sm font-medium">{t('অ্যাকশন', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                    </td>
                  </tr>
                ) : categories?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      {t('কোন ক্যাটাগরি নেই', 'No categories found')}
                    </td>
                  </tr>
                ) : (
                  categories?.map((category) => (
                    <tr key={category.id} className={cn(
                      "hover:bg-secondary/30",
                      selectedCategories.has(category.id) && "bg-primary/5"
                    )}>
                      <td className="p-4">
                        <Checkbox
                          checked={selectedCategories.has(category.id)}
                          onCheckedChange={() => toggleCategorySelection(category.id)}
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center overflow-hidden">
                            {category.image_url ? (
                              <img src={category.image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="w-6 h-6 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">
                              {language === 'bn' ? category.name_bn : category.name_en}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {language === 'bn' ? category.name_en : category.name_bn}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <code className="text-sm bg-secondary px-2 py-1 rounded">
                          {category.slug}
                        </code>
                      </td>
                      <td className="p-4">
                        <span className="text-sm">{category.sort_order}</span>
                      </td>
                      <td className="p-4">
                        {category.is_active ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            {t('সক্রিয়', 'Active')}
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                            {t('নিষ্ক্রিয়', 'Inactive')}
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(category.id, category.is_active)}
                            title={category.is_active ? t('নিষ্ক্রিয় করুন', 'Deactivate') : t('সক্রিয় করুন', 'Activate')}
                          >
                            {category.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(category)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(category.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Category Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? t('ক্যাটাগরি সম্পাদনা', 'Edit Category') : t('নতুন ক্যাটাগরি', 'New Category')}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Image Upload */}
            <div>
              <Label>{t('ছবি', 'Image')}</Label>
              <div className="mt-2 flex items-center gap-4">
                <div className="w-20 h-20 rounded-lg bg-secondary flex items-center justify-center overflow-hidden border-2 border-dashed border-border">
                  {formData.image_url ? (
                    <img src={formData.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                    <Button type="button" variant="outline" size="sm" disabled={isUploading} asChild>
                      <span>
                        <Upload className="w-4 h-4 mr-2" />
                        {isUploading ? t('আপলোড হচ্ছে...', 'Uploading...') : t('ছবি আপলোড', 'Upload Image')}
                      </span>
                    </Button>
                  </label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('সর্বোচ্চ ২MB, PNG/JPG', 'Max 2MB, PNG/JPG')}
                  </p>
                </div>
              </div>
              {formData.image_url && (
                <Input
                  type="text"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="Image URL"
                  className="mt-2"
                />
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name_bn">{t('নাম (বাংলা)', 'Name (Bangla)')} *</Label>
                <Input
                  id="name_bn"
                  value={formData.name_bn}
                  onChange={(e) => setFormData({ ...formData, name_bn: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="name_en">{t('নাম (ইংরেজি)', 'Name (English)')} *</Label>
                <Input
                  id="name_en"
                  value={formData.name_en}
                  onChange={(e) => {
                    const name = e.target.value;
                    setFormData({ 
                      ...formData, 
                      name_en: name,
                      slug: formData.slug || generateSlug(name)
                    });
                  }}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="slug">{t('স্লাগ', 'Slug')} *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: generateSlug(e.target.value) })}
                  placeholder="category-slug"
                  required
                />
              </div>
              <div>
                <Label htmlFor="sort_order">{t('সর্ট অর্ডার', 'Sort Order')}</Label>
                <Input
                  id="sort_order"
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="is_active">{t('সক্রিয়', 'Active')}</Label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                {t('বাতিল', 'Cancel')}
              </Button>
              <Button type="submit" disabled={createCategory.isPending || updateCategory.isPending}>
                {editingId ? t('আপডেট করুন', 'Update') : t('তৈরি করুন', 'Create')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId || bulkDeleteIds.length > 0} onOpenChange={() => { setDeleteId(null); setBulkDeleteIds([]); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('নিশ্চিত করুন', 'Confirm Delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {bulkDeleteIds.length > 0 ? t(
                `আপনি কি ${bulkDeleteIds.length}টি ক্যাটাগরি রিসাইকেল বিনে পাঠাতে চান? ৩০ দিনের মধ্যে পুনরুদ্ধার করা যাবে।`,
                `Move ${bulkDeleteIds.length} categories to the Recycle Bin? You can restore them within 30 days.`
              ) : t(
                'আপনি কি এই ক্যাটাগরিটি রিসাইকেল বিনে পাঠাতে চান? ৩০ দিনের মধ্যে পুনরুদ্ধার করা যাবে।',
                'Move this category to the Recycle Bin? You can restore it within 30 days.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setDeleteId(null); setBulkDeleteIds([]); }}>{t('বাতিল', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={bulkDeleteIds.length > 0 ? handleBulkDelete : handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('ডিলিট করুন', 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
