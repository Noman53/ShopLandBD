import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Zap, Loader2, Calendar, CheckSquare, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFlashSales, useCreateFlashSale, useUpdateFlashSale, useDeleteFlashSale } from '@/hooks/useFlashSales';
import { useAdminProducts } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface FlashSaleForm {
  name_bn: string;
  name_en: string;
  discount_percentage: number;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  product_ids: string[];
}

const defaultForm: FlashSaleForm = {
  name_bn: '',
  name_en: '',
  discount_percentage: 10,
  starts_at: '',
  ends_at: '',
  is_active: true,
  product_ids: [],
};

export default function AdminFlashSales() {
  const { t, language } = useLanguage();
  const { data: flashSales, isLoading, refetch } = useFlashSales();
  const { data: products } = useAdminProducts();
  const createFlashSale = useCreateFlashSale();
  const updateFlashSale = useUpdateFlashSale();
  const deleteFlashSale = useDeleteFlashSale();

  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FlashSaleForm>(defaultForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedSales, setSelectedSales] = useState<Set<string>>(new Set());
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('admin-flash-sales-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'flash_sales' }, () => {
        refetch();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetch]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm({
      ...defaultForm,
      starts_at: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      ends_at: format(new Date(Date.now() + 24 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"),
    });
    setShowDialog(true);
  };

  const handleOpenEdit = (sale: typeof flashSales extends (infer T)[] ? T : never) => {
    setEditingId(sale.id);
    const productIds = (sale as { flash_sale_products?: { product_id: string }[] }).flash_sale_products?.map((p) => p.product_id) || [];
    setForm({
      name_bn: sale.name_bn,
      name_en: sale.name_en,
      discount_percentage: sale.discount_percentage,
      starts_at: format(new Date(sale.starts_at), "yyyy-MM-dd'T'HH:mm"),
      ends_at: format(new Date(sale.ends_at), "yyyy-MM-dd'T'HH:mm"),
      is_active: sale.is_active,
      product_ids: productIds,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.name_bn.trim() || !form.name_en.trim()) {
      toast.error(t('নাম দিন', 'Please enter name'));
      return;
    }

    if (!form.starts_at || !form.ends_at) {
      toast.error(t('তারিখ সিলেক্ট করুন', 'Please select dates'));
      return;
    }

    if (new Date(form.ends_at) <= new Date(form.starts_at)) {
      toast.error(t('শেষ তারিখ শুরু তারিখের পরে হতে হবে', 'End date must be after start date'));
      return;
    }

    try {
      if (editingId) {
        await updateFlashSale.mutateAsync({
          id: editingId,
          ...form,
          starts_at: new Date(form.starts_at).toISOString(),
          ends_at: new Date(form.ends_at).toISOString(),
        });
        toast.success(t('ফ্ল্যাশ সেল আপডেট হয়েছে', 'Flash sale updated'));
      } else {
        await createFlashSale.mutateAsync({
          ...form,
          starts_at: new Date(form.starts_at).toISOString(),
          ends_at: new Date(form.ends_at).toISOString(),
        });
        toast.success(t('ফ্ল্যাশ সেল তৈরি হয়েছে', 'Flash sale created'));
      }
      setShowDialog(false);
    } catch (error) {
      toast.error(t('ত্রুটি হয়েছে', 'Error occurred'));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteFlashSale.mutateAsync(deleteId);
      toast.success(t('ফ্ল্যাশ সেলটি রিসাইকেল বিনে পাঠানো হয়েছে', 'Flash sale moved to Recycle Bin'));
      setDeleteId(null);
    } catch (error) {
      toast.error(t('ত্রুটি হয়েছে', 'Error occurred'));
    }
  };

  // Bulk selection handlers
  const toggleSaleSelection = (id: string) => {
    const newSelected = new Set(selectedSales);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedSales(newSelected);
  };

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedSales.size === 0) {
      toast.error(t('ফ্ল্যাশ সেল সিলেক্ট করুন', 'Select flash sales first'));
      return;
    }

    if (action === 'delete') {
      setBulkDeleteIds(Array.from(selectedSales));
      return;
    }

    setIsBulkUpdating(true);
    try {
      for (const id of selectedSales) {
        await updateFlashSale.mutateAsync({ id, is_active: action === 'activate' });
      }
      toast.success(t(`${selectedSales.size}টি ফ্ল্যাশ সেল আপডেট হয়েছে`, `${selectedSales.size} flash sales updated`));
      setSelectedSales(new Set());
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
        await deleteFlashSale.mutateAsync(id);
      }
      toast.success(
        t(
          `${bulkDeleteIds.length}টি ফ্ল্যাশ সেল রিসাইকেল বিনে পাঠানো হয়েছে`,
          `${bulkDeleteIds.length} flash sales moved to Recycle Bin`
        )
      );
      setBulkDeleteIds([]);
      setSelectedSales(new Set());
    } catch (error) {
      toast.error(t('ত্রুটি হয়েছে', 'Error occurred'));
    }
  };

  const toggleProduct = (productId: string) => {
    setForm(prev => ({
      ...prev,
      product_ids: prev.product_ids.includes(productId)
        ? prev.product_ids.filter(id => id !== productId)
        : [...prev.product_ids, productId],
    }));
  };

  const isActive = (sale: { starts_at: string; ends_at: string; is_active: boolean }) => {
    const now = new Date();
    return sale.is_active && new Date(sale.starts_at) <= now && new Date(sale.ends_at) >= now;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Zap className="w-7 h-7 text-yellow-500" />
              {t('ফ্ল্যাশ সেল', 'Flash Sales')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t('সময়-সীমিত অফার তৈরি করুন', 'Create time-limited offers')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {selectedSales.size > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" disabled={isBulkUpdating}>
                    {isBulkUpdating ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckSquare className="w-4 h-4 mr-2" />
                    )}
                    {t('বাল্ক অ্যাকশন', 'Bulk Actions')} ({selectedSales.size})
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

            <Button onClick={handleOpenCreate}>
              <Plus className="w-4 h-4 mr-2" />
              {t('নতুন ফ্ল্যাশ সেল', 'New Flash Sale')}
            </Button>
          </div>
        </div>

        {/* Flash Sales List */}
        <div className="grid gap-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : flashSales?.length === 0 ? (
            <div className="bg-card border rounded-xl p-12 text-center">
              <Zap className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold mb-2">{t('কোন ফ্ল্যাশ সেল নেই', 'No Flash Sales')}</h3>
              <p className="text-muted-foreground mb-4">
                {t('নতুন ফ্ল্যাশ সেল তৈরি করে শুরু করুন', 'Get started by creating a new flash sale')}
              </p>
              <Button onClick={handleOpenCreate}>
                <Plus className="w-4 h-4 mr-2" />
                {t('ফ্ল্যাশ সেল তৈরি করুন', 'Create Flash Sale')}
              </Button>
            </div>
          ) : (
            flashSales?.map(sale => (
              <div
                key={sale.id}
                className={cn(
                  "bg-card border rounded-xl p-4 md:p-6",
                  isActive(sale) && 'border-yellow-500/50 bg-yellow-500/5',
                  selectedSales.has(sale.id) && 'ring-2 ring-primary'
                )}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <Checkbox
                      checked={selectedSales.has(sale.id)}
                      onCheckedChange={() => toggleSaleSelection(sale.id)}
                      className="mt-1"
                    />
                    <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">
                        {language === 'bn' ? sale.name_bn : sale.name_en}
                      </h3>
                      {isActive(sale) && (
                        <span className="px-2 py-0.5 rounded-full bg-yellow-500 text-white text-xs font-medium animate-pulse">
                          LIVE
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Zap className="w-4 h-4" />
                        {sale.discount_percentage}% {t('ছাড়', 'OFF')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(sale.starts_at), 'MMM dd, HH:mm')} - {format(new Date(sale.ends_at), 'MMM dd, HH:mm')}
                      </span>
                      <span>
                        {(sale as { flash_sale_products?: unknown[] }).flash_sale_products?.length || 0} {t('পণ্য', 'products')}
                      </span>
                    </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenEdit(sale)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteId(sale.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? t('ফ্ল্যাশ সেল সম্পাদনা', 'Edit Flash Sale') : t('নতুন ফ্ল্যাশ সেল', 'New Flash Sale')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('নাম (বাংলা)', 'Name (Bangla)')}</Label>
                <Input
                  value={form.name_bn}
                  onChange={(e) => setForm({ ...form, name_bn: e.target.value })}
                  placeholder={t('ফ্ল্যাশ সেল নাম', 'Flash sale name')}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>{t('নাম (ইংরেজি)', 'Name (English)')}</Label>
                <Input
                  value={form.name_en}
                  onChange={(e) => setForm({ ...form, name_en: e.target.value })}
                  placeholder="Flash sale name"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>{t('ডিসকাউন্ট (%)', 'Discount (%)')}</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={form.discount_percentage}
                onChange={(e) => setForm({ ...form, discount_percentage: parseInt(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('শুরু তারিখ', 'Start Date')}</Label>
                <Input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>{t('শেষ তারিখ', 'End Date')}</Label>
                <Input
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_active}
                onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
              />
              <Label>{t('সক্রিয়', 'Active')}</Label>
            </div>

            {/* Product Selection */}
            <div>
              <Label className="mb-2 block">{t('পণ্য সিলেক্ট করুন', 'Select Products')}</Label>
              <div className="border rounded-lg max-h-60 overflow-y-auto">
                {products?.map(product => (
                  <label
                    key={product.id}
                    className="flex items-center gap-3 p-3 hover:bg-secondary/50 cursor-pointer border-b last:border-b-0"
                  >
                    <Checkbox
                      checked={form.product_ids.includes(product.id)}
                      onCheckedChange={() => toggleProduct(product.id)}
                    />
                    <div className="flex-1">
                      <p className="font-medium">
                        {language === 'bn' ? product.name_bn : product.name_en}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ৳{product.price.toLocaleString()}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {form.product_ids.length} {t('পণ্য সিলেক্টেড', 'products selected')}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              {t('বাতিল', 'Cancel')}
            </Button>
            <Button
              onClick={handleSave}
              disabled={createFlashSale.isPending || updateFlashSale.isPending}
            >
              {(createFlashSale.isPending || updateFlashSale.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {t('সেভ করুন', 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId || bulkDeleteIds.length > 0} onOpenChange={() => { setDeleteId(null); setBulkDeleteIds([]); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('নিশ্চিত করুন', 'Confirm Delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {bulkDeleteIds.length > 0 ? t(
                `আপনি কি ${bulkDeleteIds.length}টি ফ্ল্যাশ সেল রিসাইকেল বিনে পাঠাতে চান? ৩০ দিনের মধ্যে পুনরুদ্ধার করা যাবে।`,
                `Move ${bulkDeleteIds.length} flash sales to the Recycle Bin? You can restore them within 30 days.`
              ) : t(
                'আপনি কি এই ফ্ল্যাশ সেলটি রিসাইকেল বিনে পাঠাতে চান? ৩০ দিনের মধ্যে পুনরুদ্ধার করা যাবে।',
                'Move this flash sale to the Recycle Bin? You can restore it within 30 days.'
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
