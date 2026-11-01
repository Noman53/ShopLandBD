import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye, EyeOff, Star, StarOff, Copy, Upload, X, GripVertical, Image as ImageIcon, CheckSquare, Square, Ruler, Palette, Filter, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAdminProducts, useUpdateProduct, useDeleteProduct, useCreateProduct } from '@/hooks/useAdmin';
import { useCategories } from '@/hooks/useProducts';
import { useComputedProductStock } from '@/hooks/useComputedProductStock';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/admin/AdminLayout';
import ProductSizeManager from '@/components/admin/ProductSizeManager';
import ProductColorManager from '@/components/admin/ProductColorManager';
import BulkProductUpload from '@/components/admin/BulkProductUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ProductFormData {
  name_bn: string;
  name_en: string;
  description_bn: string;
  description_en: string;
  price: string;
  discount_price: string;
  stock_quantity: string;
  category_id: string;
  is_active: boolean;
  is_featured: boolean;
  is_wearable: boolean;
  has_color_variants: boolean;
  size_chart_image: string;
  images: string[];
}

const emptyProduct: ProductFormData = {
  name_bn: '',
  name_en: '',
  description_bn: '',
  description_en: '',
  price: '',
  discount_price: '',
  stock_quantity: '0',
  category_id: '',
  is_active: true,
  is_featured: false,
  is_wearable: false,
  has_color_variants: false,
  size_chart_image: '',
  images: [],
};

// Upload size chart image
const uploadSizeChartImage = async (file: File): Promise<string | null> => {
  if (!file.type.startsWith('image/')) {
    toast.error('Only images can be uploaded');
    return null;
  }
  if (file.size > 5 * 1024 * 1024) {
    toast.error('Image size should not exceed 5MB');
    return null;
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `size-chart-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
  const filePath = `size-charts/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(filePath, file);

  if (uploadError) {
    toast.error('Upload failed');
    return null;
  }

  const { data: publicUrl } = supabase.storage
    .from('product-images')
    .getPublicUrl(filePath);

  return publicUrl.publicUrl;
};

export default function AdminProducts() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { data: products, isLoading, refetch } = useAdminProducts();
  const { data: categories } = useCategories();
  const [searchParams] = useSearchParams();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const createProduct = useCreateProduct();

  const { stockByProductId } = useComputedProductStock(products);
  const getStock = useCallback(
    (productId: string, fallback: number) => stockByProductId.get(productId) ?? fallback,
    [stockByProductId]
  );

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(emptyProduct);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [isUploading, setIsUploading] = useState(false);
  const [isSizeChartUploading, setIsSizeChartUploading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  
  // Filter states (like Orders)
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('admin-products-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        refetch();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_sizes' }, () => {
        refetch();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetch]);

  const filter = searchParams.get('filter');
  const displayedProducts = useMemo(() => {
    const list = products ?? [];
    let filtered = [...list];

    // URL-based filter (from dashboard clicks)
    if (filter === 'out-of-stock') {
      filtered = filtered.filter((p) => getStock(p.id, p.stock_quantity) <= 0 && p.is_active);
    } else if (filter === 'low-stock') {
      filtered = filtered.filter((p) => {
        const stock = getStock(p.id, p.stock_quantity);
        return stock > 0 && stock < 10;
      });
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name_bn.toLowerCase().includes(query) || 
        p.name_en.toLowerCase().includes(query) ||
        p.id.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      if (categoryFilter === 'has-sizes') {
        filtered = filtered.filter(p => p.is_wearable);
      } else {
        filtered = filtered.filter(p => p.category_id === categoryFilter);
      }
    }

    // Stock filter (dropdown)
    if (stockFilter === 'in-stock') {
      filtered = filtered.filter(p => getStock(p.id, p.stock_quantity) > 0);
    } else if (stockFilter === 'out-of-stock') {
      filtered = filtered.filter(p => getStock(p.id, p.stock_quantity) <= 0);
    } else if (stockFilter === 'low-stock') {
      filtered = filtered.filter(p => {
        const stock = getStock(p.id, p.stock_quantity);
        return stock > 0 && stock < 10;
      });
    }

    // Status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter(p => p.is_active);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(p => !p.is_active);
    }

    return filtered;
  }, [products, filter, getStock, searchQuery, categoryFilter, stockFilter, statusFilter]);

  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setStockFilter('all');
    setStatusFilter('all');
    if (filter) {
      navigate('/admin/products');
    }
  };

  const hasActiveFilters = searchQuery || categoryFilter !== 'all' || stockFilter !== 'all' || statusFilter !== 'all' || !!filter;

  const formatPrice = (amount: number) => `৳${amount.toLocaleString('bn-BD')}`;

  const handleEdit = (product: typeof products extends (infer T)[] ? T : never) => {
    setEditingId(product.id);
    setFormData({
      name_bn: product.name_bn,
      name_en: product.name_en,
      description_bn: product.description_bn || '',
      description_en: product.description_en || '',
      price: String(product.price),
      discount_price: product.discount_price ? String(product.discount_price) : '',
      stock_quantity: String(product.stock_quantity),
      category_id: product.category_id || '',
      is_active: product.is_active,
      is_featured: product.is_featured,
      is_wearable: product.is_wearable || false,
      has_color_variants: (product as any).has_color_variants || false,
      size_chart_image: (product as any).size_chart_image || '',
      images: product.images || [],
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingId(null);
    setFormData(emptyProduct);
    setIsDialogOpen(true);
  };

  const handleDuplicate = (product: typeof products extends (infer T)[] ? T : never) => {
    setEditingId(null);
    setFormData({
      name_bn: `${product.name_bn} (কপি)`,
      name_en: `${product.name_en} (Copy)`,
      description_bn: product.description_bn || '',
      description_en: product.description_en || '',
      price: String(product.price),
      discount_price: product.discount_price ? String(product.discount_price) : '',
      stock_quantity: String(product.stock_quantity),
      category_id: product.category_id || '',
      is_active: false, // Start as draft
      is_featured: false,
      is_wearable: product.is_wearable || false,
      has_color_variants: (product as any).has_color_variants || false,
      size_chart_image: (product as any).size_chart_image || '',
      images: product.images || [],
    });
    setIsDialogOpen(true);
    toast.info(t('পণ্যটি ডুপ্লিকেট হয়েছে', 'Product duplicated'));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newImages: string[] = [];

    try {
      for (const file of Array.from(files)) {
        // Validate
        if (!file.type.startsWith('image/')) continue;
        if (file.size > 5 * 1024 * 1024) {
          toast.error(t('ছবির সাইজ ৫MB এর বেশি হতে পারবে না', 'Image size should not exceed 5MB'));
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `product-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const filePath = `products/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: publicUrl } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        newImages.push(publicUrl.publicUrl);
      }

      setFormData({ ...formData, images: [...formData.images, ...newImages] });
      toast.success(t('ছবি আপলোড হয়েছে', 'Images uploaded'));
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(t('ছবি আপলোড ব্যর্থ হয়েছে', 'Image upload failed'));
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...formData.images];
    newImages.splice(index, 1);
    setFormData({ ...formData, images: newImages });
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newImages = [...formData.images];
    const draggedImage = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedImage);
    setFormData({ ...formData, images: newImages });
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name_bn || !formData.name_en || !formData.price) {
      toast.error(t('সব প্রয়োজনীয় ফিল্ড পূরণ করুন', 'Please fill all required fields'));
      return;
    }

    try {
      const productData = {
        name_bn: formData.name_bn,
        name_en: formData.name_en,
        description_bn: formData.description_bn || null,
        description_en: formData.description_en || null,
        price: parseFloat(formData.price),
        discount_price: formData.discount_price ? parseFloat(formData.discount_price) : null,
        stock_quantity: (formData.is_wearable || formData.has_color_variants) ? 0 : (parseInt(formData.stock_quantity) || 0),
        category_id: formData.category_id || null,
        is_active: formData.is_active,
        is_featured: formData.is_featured,
        is_wearable: formData.is_wearable,
        has_color_variants: formData.has_color_variants,
        size_chart_image: formData.size_chart_image || null,
        images: formData.images,
      };

      if (editingId) {
        await updateProduct.mutateAsync({ id: editingId, ...productData });
        toast.success(t('পণ্য আপডেট হয়েছে', 'Product updated'));
      } else {
        await createProduct.mutateAsync(productData);
        toast.success(t('পণ্য তৈরি হয়েছে', 'Product created'));
      }

      setIsDialogOpen(false);
    } catch (error) {
      toast.error(t('ত্রুটি হয়েছে', 'Error occurred'));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await deleteProduct.mutateAsync(deleteId);
      toast.success(t('পণ্যটি রিসাইকেল বিনে পাঠানো হয়েছে', 'Product moved to Recycle Bin'));
      setDeleteId(null);
    } catch (error) {
      toast.error(t('ত্রুটি হয়েছে', 'Error occurred'));
    }
  };

  const handleBulkDelete = async () => {
    if (bulkDeleteIds.length === 0) return;

    try {
      for (const id of bulkDeleteIds) {
        await deleteProduct.mutateAsync(id);
      }
      toast.success(
        t(
          `${bulkDeleteIds.length}টি পণ্য রিসাইকেল বিনে পাঠানো হয়েছে`,
          `${bulkDeleteIds.length} products moved to Recycle Bin`
        )
      );
      setBulkDeleteIds([]);
      setSelectedProducts(new Set());
    } catch (error) {
      toast.error(t('ত্রুটি হয়েছে', 'Error occurred'));
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await updateProduct.mutateAsync({ id, is_active: !isActive });
      toast.success(t('স্ট্যাটাস আপডেট হয়েছে', 'Status updated'));
    } catch (error) {
      toast.error(t('ত্রুটি হয়েছে', 'Error occurred'));
    }
  };

  const handleToggleFeatured = async (id: string, isFeatured: boolean) => {
    try {
      await updateProduct.mutateAsync({ id, is_featured: !isFeatured });
      toast.success(t('ফিচার্ড স্ট্যাটাস আপডেট হয়েছে', 'Featured status updated'));
    } catch (error) {
      toast.error(t('ত্রুটি হয়েছে', 'Error occurred'));
    }
  };

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedProducts.size === 0) {
      toast.error(t('পণ্য সিলেক্ট করুন', 'Select products first'));
      return;
    }

    if (action === 'delete') {
      setBulkDeleteIds(Array.from(selectedProducts));
      return;
    }

    try {
      for (const id of selectedProducts) {
        await updateProduct.mutateAsync({ id, is_active: action === 'activate' });
      }
      toast.success(t('পণ্য আপডেট হয়েছে', 'Products updated'));
      setSelectedProducts(new Set());
    } catch (error) {
      toast.error(t('ত্রুটি হয়েছে', 'Error occurred'));
    }
  };

  const toggleProductSelection = (id: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedProducts(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedProducts.size === displayedProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(displayedProducts.map(p => p.id)));
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {t('পণ্য সমূহ', 'Products')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t('পণ্য যোগ করুন এবং ম্যানেজ করুন', 'Add and manage products')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {selectedProducts.size > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    {t('বাল্ক অ্যাকশন', 'Bulk Actions')} ({selectedProducts.size})
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
              {t('নতুন পণ্য', 'New Product')}
            </Button>

            <Button variant="outline" onClick={() => setShowBulkUpload(true)}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              {t('বাল্ক আপলোড', 'Bulk Upload')}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(hasActiveFilters && 'border-primary text-primary')}
            >
              <Filter className="w-4 h-4 mr-2" />
              {t('ফিল্টার', 'Filters')}
              {hasActiveFilters && (
                <span className="ml-2 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                  !
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Filters Panel (like Orders) */}
        {showFilters && (
          <div className="bg-card border rounded-xl p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  {t('অনুসন্ধান', 'Search')}
                </Label>
                <Input
                  placeholder={t('আইডি, নাম...', 'ID, name...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Category */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  {t('ক্যাটাগরি', 'Category')}
                </Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('সব ক্যাটাগরি', 'All Categories')}</SelectItem>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {language === 'bn' ? cat.name_bn : cat.name_en}
                      </SelectItem>
                    ))}
                    <SelectItem value="has-sizes">{t('সাইজ আছে এমন পণ্য', 'Products with Sizes')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Stock Status */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  {t('স্টক স্ট্যাটাস', 'Stock Status')}
                </Label>
                <Select value={stockFilter} onValueChange={setStockFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('সব স্টক', 'All Stock')}</SelectItem>
                    <SelectItem value="in-stock">{t('স্টক আছে', 'In Stock')}</SelectItem>
                    <SelectItem value="low-stock">{t('স্টক কম', 'Low Stock')}</SelectItem>
                    <SelectItem value="out-of-stock">{t('স্টক শেষ', 'Out of Stock')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Product Status */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  {t('পণ্য স্ট্যাটাস', 'Product Status')}
                </Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('সব স্ট্যাটাস', 'All Status')}</SelectItem>
                    <SelectItem value="active">{t('সক্রিয়', 'Active')}</SelectItem>
                    <SelectItem value="inactive">{t('নিষ্ক্রিয়', 'Inactive')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex justify-between items-center pt-2 border-t">
                <p className="text-sm text-muted-foreground">
                  {displayedProducts.length} {t('টি পণ্য', 'products found')}
                </p>
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  {t('ফিল্টার ক্লিয়ার', 'Clear Filters')}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Products Table */}
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="w-12 p-4">
                    <Checkbox
                      checked={products?.length ? selectedProducts.size === products.length : false}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="text-left p-4 text-sm font-medium">{t('পণ্য', 'Product')}</th>
                  <th className="text-left p-4 text-sm font-medium">{t('মূল্য', 'Price')}</th>
                  <th className="text-left p-4 text-sm font-medium">{t('স্টক', 'Stock')}</th>
                  <th className="text-left p-4 text-sm font-medium">{t('ক্যাটাগরি', 'Category')}</th>
                  <th className="text-left p-4 text-sm font-medium">{t('স্ট্যাটাস', 'Status')}</th>
                  <th className="text-left p-4 text-sm font-medium">{t('অ্যাকশন', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                    </td>
                  </tr>
                ) : products?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      {t('কোন পণ্য নেই', 'No products found')}
                    </td>
                  </tr>
                ) : (
                  displayedProducts.map((product) => {
                    const stock = getStock(product.id, product.stock_quantity);
                    return (
                    <tr key={product.id} className={cn(
                      'hover:bg-secondary/30',
                      selectedProducts.has(product.id) && 'bg-primary/5'
                    )}>
                      <td className="p-4">
                        <Checkbox
                          checked={selectedProducts.has(product.id)}
                          onCheckedChange={() => toggleProductSelection(product.id)}
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center overflow-hidden">
                            {product.images?.[0] ? (
                              <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="w-6 h-6 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium line-clamp-1">
                              {language === 'bn' ? product.name_bn : product.name_en}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              #{product.id.slice(0, 8)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        {product.discount_price ? (
                          <div>
                            <p className="font-medium text-primary">{formatPrice(Number(product.discount_price))}</p>
                            <p className="text-xs text-muted-foreground line-through">{formatPrice(Number(product.price))}</p>
                          </div>
                        ) : (
                          <p className="font-medium">{formatPrice(Number(product.price))}</p>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={cn(
                          'font-medium',
                          stock > 10 ? 'text-green-600' :
                          stock > 0 ? 'text-yellow-600' : 'text-red-600'
                        )}>
                          {stock}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm">
                          {product.categories 
                            ? (language === 'bn' ? product.categories.name_bn : product.categories.name_en)
                            : '-'
                          }
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          {product.is_active ? (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              {t('সক্রিয়', 'Active')}
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                              {t('ড্রাফট', 'Draft')}
                            </span>
                          )}
                          {product.is_featured && (
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          )}
                          {product.is_wearable && (
                            <span title={t('সাইজ আছে', 'Has Sizes')}>
                              <Ruler className="w-4 h-4 text-blue-500" />
                            </span>
                          )}
                          {(product as any).has_color_variants && (
                            <span title={t('রঙ আছে', 'Has Colors')}>
                              <Palette className="w-4 h-4 text-pink-500" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(product.id, product.is_active)}
                            title={product.is_active ? t('নিষ্ক্রিয় করুন', 'Deactivate') : t('সক্রিয় করুন', 'Activate')}
                          >
                            {product.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleFeatured(product.id, product.is_featured)}
                            title={product.is_featured ? t('আনফিচার্ড করুন', 'Unfeature') : t('ফিচার্ড করুন', 'Feature')}
                          >
                            {product.is_featured ? <StarOff className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDuplicate(product)}
                            title={t('ডুপ্লিকেট করুন', 'Duplicate')}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(product)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(product.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Product Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? t('পণ্য সম্পাদনা', 'Edit Product') : t('নতুন পণ্য', 'New Product')}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Image Upload Section */}
            <div>
              <Label className="mb-2 block">{t('পণ্যের ছবি', 'Product Images')}</Label>
              <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                {formData.images.map((image, index) => (
                  <div
                    key={index}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      'relative aspect-square rounded-lg overflow-hidden border-2 cursor-move group',
                      draggedIndex === index ? 'border-primary opacity-50' : 'border-transparent',
                      index === 0 && 'ring-2 ring-primary ring-offset-2'
                    )}
                  >
                    <img src={image} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      <GripVertical className="w-4 h-4 text-white" />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="p-1 rounded bg-destructive text-white hover:bg-destructive/80"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {index === 0 && (
                      <span className="absolute bottom-1 left-1 text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                        {t('প্রধান', 'Main')}
                      </span>
                    )}
                  </div>
                ))}
                
                {/* Upload Button */}
                <label className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 flex flex-col items-center justify-center cursor-pointer transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                  {isUploading ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground mt-1">{t('আপলোড', 'Upload')}</span>
                    </>
                  )}
                </label>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {t('প্রথম ছবিটি প্রধান ছবি হিসেবে দেখানো হবে। ড্র্যাগ করে সাজান।', 
                  'First image will be the main image. Drag to reorder.')}
              </p>
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
                  onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="description_bn">{t('বিবরণ (বাংলা)', 'Description (Bangla)')}</Label>
                <Textarea
                  id="description_bn"
                  value={formData.description_bn}
                  onChange={(e) => setFormData({ ...formData, description_bn: e.target.value })}
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="description_en">{t('বিবরণ (ইংরেজি)', 'Description (English)')}</Label>
                <Textarea
                  id="description_en"
                  value={formData.description_en}
                  onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                  rows={4}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="price">{t('মূল্য', 'Price')} *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="discount_price">{t('ডিসকাউন্ট মূল্য', 'Discount Price')}</Label>
                <Input
                  id="discount_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.discount_price}
                  onChange={(e) => setFormData({ ...formData, discount_price: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="stock_quantity">{t('স্টক', 'Stock')}</Label>
                <Input
                  id="stock_quantity"
                  type="number"
                  min="0"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="category_id">{t('ক্যাটাগরি', 'Category')}</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('বাছাই করুন', 'Select')} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {language === 'bn' ? cat.name_bn : cat.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Size/Color Managers (requires product saved first) */}
            {editingId && (
              <>
                <ProductSizeManager
                  productId={editingId}
                  isWearable={formData.is_wearable}
                  onWearableChange={(isWearable) => setFormData({ ...formData, is_wearable: isWearable })}
                />
                <ProductColorManager
                  productId={editingId}
                  hasColorVariants={formData.has_color_variants}
                  isWearable={formData.is_wearable}
                  onColorVariantsChange={(hasColors) => setFormData({ ...formData, has_color_variants: hasColors })}
                />
              </>
            )}

            {/* Size Chart Image Upload - show for both create & edit when wearable is enabled */}
            {formData.is_wearable && (
              <div className="border rounded-lg p-4 bg-secondary/20 space-y-3">
                <Label className="font-medium flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  {t('সাইজ চার্ট ছবি', 'Size Chart Image')}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t(
                    'সাইজ চার্টের একটি ছবি আপলোড করুন যা গ্রাহকদের সাইজ নির্বাচনে সাহায্য করবে',
                    'Upload a size chart image to help customers choose the right size'
                  )}
                </p>

                {formData.size_chart_image ? (
                  <div className="relative inline-block">
                    <img
                      src={formData.size_chart_image}
                      alt="Size Chart"
                      className="max-w-xs h-auto rounded-lg border"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, size_chart_image: '' })}
                      className="absolute -top-2 -right-2 p-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/80"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-muted-foreground/30 rounded-lg hover:border-primary/50 cursor-pointer transition-colors bg-background">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={isSizeChartUploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setIsSizeChartUploading(true);
                        const url = await uploadSizeChartImage(file);
                        if (url) {
                          setFormData({ ...formData, size_chart_image: url });
                          toast.success(t('সাইজ চার্ট আপলোড হয়েছে', 'Size chart uploaded'));
                        }
                        setIsSizeChartUploading(false);
                      }}
                    />
                    {isSizeChartUploading ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">
                          {t('সাইজ চার্ট আপলোড করুন', 'Upload Size Chart')}
                        </span>
                      </>
                    )}
                  </label>
                )}
              </div>
            )}

            {/* Wearable toggle for new products */}
            {!editingId && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-4 border rounded-lg bg-secondary/20">
                  <Ruler className="w-5 h-5 text-muted-foreground" />
                  <label className="flex items-center gap-2 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={formData.is_wearable}
                      onChange={(e) => setFormData({ ...formData, is_wearable: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <div>
                      <span className="font-medium">{t('এটি একটি পোশাক/জুতা পণ্য', 'This is a wearable product')}</span>
                      <p className="text-xs text-muted-foreground">
                        {t(
                          'সাইজ ম্যানেজমেন্ট সক্রিয় করতে এটি চেক করুন। পণ্য তৈরির পর সাইজ যোগ করতে পারবেন।',
                          'Check this to enable size management. You can add sizes after creating the product.'
                        )}
                      </p>
                    </div>
                  </label>
                </div>

                <div className="flex items-center gap-3 p-4 border rounded-lg bg-secondary/20">
                  <Palette className="w-5 h-5 text-muted-foreground" />
                  <label className="flex items-center gap-2 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={formData.has_color_variants}
                      onChange={(e) => setFormData({ ...formData, has_color_variants: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <div>
                      <span className="font-medium">{t('রঙের বৈচিত্র্য', 'Color variants')}</span>
                      <p className="text-xs text-muted-foreground">
                        {t(
                          'পণ্য তৈরির পর রঙ যোগ করতে পারবেন।',
                          'You can add colors after creating the product.'
                        )}
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span>{t('সক্রিয়', 'Active')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span>{t('ফিচার্ড', 'Featured')}</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                {t('বাতিল', 'Cancel')}
              </Button>
              <Button type="submit" disabled={createProduct.isPending || updateProduct.isPending}>
                {editingId ? t('আপডেট করুন', 'Update') : t('তৈরি করুন', 'Create')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('পণ্য ডিলিট করুন?', 'Delete Product?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                'এই পণ্যটি রিসাইকেল বিনে যাবে। ৩০ দিনের মধ্যে পুনরুদ্ধার করা যাবে।',
                'This product will be moved to the Recycle Bin. You can restore it within 30 days.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('বাতিল', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('ডিলিট করুন', 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteIds.length > 0} onOpenChange={() => setBulkDeleteIds([])}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('একাধিক পণ্য ডিলিট করুন?', 'Delete Multiple Products?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                `${bulkDeleteIds.length}টি পণ্য রিসাইকেল বিনে যাবে। ৩০ দিনের মধ্যে পুনরুদ্ধার করা যাবে।`,
                `${bulkDeleteIds.length} products will be moved to the Recycle Bin. You can restore them within 30 days.`
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('বাতিল', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('ডিলিট করুন', 'Delete All')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Upload Dialog */}
      <BulkProductUpload open={showBulkUpload} onOpenChange={setShowBulkUpload} />
    </AdminLayout>
  );
}
