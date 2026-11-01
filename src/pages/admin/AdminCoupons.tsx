import React, { useState } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, Copy, Calendar } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { formatPrice } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  minimum_order_value: number | null;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

interface CouponFormData {
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: string;
  minimum_order_value: string;
  max_uses: string;
  expires_at: Date | undefined;
  is_active: boolean;
}

const emptyCoupon: CouponFormData = {
  code: '',
  discount_type: 'percentage',
  discount_value: '',
  minimum_order_value: '',
  max_uses: '',
  expires_at: undefined,
  is_active: true,
};

export default function AdminCoupons() {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CouponFormData>(emptyCoupon);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([]);
  const [selectedCoupons, setSelectedCoupons] = useState<Set<string>>(new Set());

  const { data: coupons, isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Coupon[];
    },
  });

  const createCoupon = useMutation({
    mutationFn: async (data: Omit<CouponFormData, 'discount_value' | 'minimum_order_value' | 'max_uses' | 'expires_at'> & {
      discount_value: number;
      minimum_order_value: number | null;
      max_uses: number | null;
      expires_at: string | null;
    }) => {
      const { error } = await supabase.from('coupons').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
    },
  });

  const updateCoupon = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<Coupon>) => {
      const { error } = await supabase.from('coupons').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
    },
  });

  const deleteCoupon = useMutation({
    mutationFn: async (id: string) => {
      // Soft delete - set deleted_at timestamp
      const { error } = await supabase.from('coupons').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      queryClient.invalidateQueries({ queryKey: ['deleted-coupons'] });
    },
  });

  const handleEdit = (coupon: Coupon) => {
    setEditingId(coupon.id);
    setFormData({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: String(coupon.discount_value),
      minimum_order_value: coupon.minimum_order_value ? String(coupon.minimum_order_value) : '',
      max_uses: coupon.max_uses ? String(coupon.max_uses) : '',
      expires_at: coupon.expires_at ? new Date(coupon.expires_at) : undefined,
      is_active: coupon.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingId(null);
    setFormData(emptyCoupon);
    setIsDialogOpen(true);
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, code });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code || !formData.discount_value) {
      toast.error(t('সব প্রয়োজনীয় ফিল্ড পূরণ করুন', 'Please fill all required fields'));
      return;
    }

    const discountValue = parseFloat(formData.discount_value);
    if (formData.discount_type === 'percentage' && (discountValue <= 0 || discountValue > 100)) {
      toast.error(t('পার্সেন্টেজ ১ থেকে ১০০ এর মধ্যে হতে হবে', 'Percentage must be between 1 and 100'));
      return;
    }

    try {
      const couponData = {
        code: formData.code.toUpperCase(),
        discount_type: formData.discount_type,
        discount_value: discountValue,
        minimum_order_value: formData.minimum_order_value ? parseFloat(formData.minimum_order_value) : null,
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
        expires_at: formData.expires_at ? formData.expires_at.toISOString() : null,
        is_active: formData.is_active,
      };

      if (editingId) {
        await updateCoupon.mutateAsync({ id: editingId, ...couponData });
        toast.success(t('কুপন আপডেট হয়েছে', 'Coupon updated'));
      } else {
        await createCoupon.mutateAsync(couponData);
        toast.success(t('কুপন তৈরি হয়েছে', 'Coupon created'));
      }

      setIsDialogOpen(false);
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error(t('এই কোড আগে থেকে আছে', 'This code already exists'));
      } else {
        toast.error(t('ত্রুটি হয়েছে', 'Error occurred'));
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await deleteCoupon.mutateAsync(deleteId);
      toast.success(t('কুপনটি রিসাইকেল বিনে পাঠানো হয়েছে', 'Coupon moved to Recycle Bin'));
      setDeleteId(null);
    } catch (error) {
      toast.error(t('ত্রুটি হয়েছে', 'Error occurred'));
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await updateCoupon.mutateAsync({ id, is_active: !isActive });
      toast.success(t('স্ট্যাটাস আপডেট হয়েছে', 'Status updated'));
    } catch (error) {
      toast.error(t('ত্রুটি হয়েছে', 'Error occurred'));
    }
  };

  const toggleCouponSelection = (id: string) => {
    const next = new Set(selectedCoupons);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedCoupons(next);
  };

  const toggleSelectAll = () => {
    if (!coupons?.length) return;
    if (selectedCoupons.size === coupons.length) setSelectedCoupons(new Set());
    else setSelectedCoupons(new Set(coupons.map(c => c.id)));
  };

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedCoupons.size === 0) {
      toast.error(t('কুপন সিলেক্ট করুন', 'Select coupons first'));
      return;
    }

    if (action === 'delete') {
      setBulkDeleteIds(Array.from(selectedCoupons));
      return;
    }

    try {
      for (const id of selectedCoupons) {
        await updateCoupon.mutateAsync({ id, is_active: action === 'activate' });
      }
      toast.success(t('কুপন আপডেট হয়েছে', 'Coupons updated'));
      setSelectedCoupons(new Set());
    } catch (error) {
      toast.error(t('ত্রুটি হয়েছে', 'Error occurred'));
    }
  };

  const handleBulkDelete = async () => {
    if (bulkDeleteIds.length === 0) return;
    try {
      for (const id of bulkDeleteIds) {
        await deleteCoupon.mutateAsync(id);
      }
      toast.success(t('কুপনগুলো রিসাইকেল বিনে পাঠানো হয়েছে', 'Coupons moved to Recycle Bin'));
      setBulkDeleteIds([]);
      setSelectedCoupons(new Set());
    } catch (error) {
      toast.error(t('ত্রুটি হয়েছে', 'Error occurred'));
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(t('কোড কপি হয়েছে', 'Code copied'));
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {t('কুপন সমূহ', 'Coupons')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t('ডিসকাউন্ট কুপন তৈরি এবং ম্যানেজ করুন', 'Create and manage discount coupons')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {selectedCoupons.size > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    {t('বাল্ক অ্যাকশন', 'Bulk Actions')} ({selectedCoupons.size})
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
              {t('নতুন কুপন', 'New Coupon')}
            </Button>
          </div>
        </div>

        {/* Coupons Table */}
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="w-12 p-4">
                    <Checkbox
                      checked={coupons?.length ? selectedCoupons.size === coupons.length : false}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="text-left p-4 text-sm font-medium">{t('কোড', 'Code')}</th>
                  <th className="text-left p-4 text-sm font-medium">{t('ডিসকাউন্ট', 'Discount')}</th>
                  <th className="text-left p-4 text-sm font-medium">{t('ব্যবহার', 'Usage')}</th>
                  <th className="text-left p-4 text-sm font-medium">{t('মেয়াদ', 'Expires')}</th>
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
                ) : coupons?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      {t('কোন কুপন নেই', 'No coupons found')}
                    </td>
                  </tr>
                ) : (
                  coupons?.map((coupon) => (
                    <tr key={coupon.id} className="hover:bg-secondary/30">
                      <td className="p-4">
                        <Checkbox
                          checked={selectedCoupons.has(coupon.id)}
                          onCheckedChange={() => toggleCouponSelection(coupon.id)}
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-bold bg-primary/10 text-primary px-2 py-1 rounded">
                            {coupon.code}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyCode(coupon.code)}
                            className="h-7 w-7 p-0"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium">
                            {coupon.discount_type === 'percentage'
                              ? `${coupon.discount_value}%`
                              : formatPrice(coupon.discount_value, language)}
                          </p>
                          {coupon.minimum_order_value && coupon.minimum_order_value > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {t('সর্বনিম্ন:', 'Min:')} {formatPrice(coupon.minimum_order_value, language)}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm">
                          {coupon.used_count}
                          {coupon.max_uses ? ` / ${coupon.max_uses}` : ''}
                        </span>
                      </td>
                      <td className="p-4">
                        {coupon.expires_at ? (
                          <span className={cn(
                            'text-sm',
                            isExpired(coupon.expires_at) && 'text-destructive'
                          )}>
                            {format(new Date(coupon.expires_at), 'dd/MM/yyyy')}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        {isExpired(coupon.expires_at) ? (
                          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                            {t('মেয়াদ শেষ', 'Expired')}
                          </span>
                        ) : coupon.is_active ? (
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
                            onClick={() => handleToggleActive(coupon.id, coupon.is_active)}
                            title={coupon.is_active ? t('নিষ্ক্রিয় করুন', 'Deactivate') : t('সক্রিয় করুন', 'Activate')}
                          >
                            {coupon.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(coupon)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(coupon.id)}
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

      {/* Coupon Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? t('কুপন সম্পাদনা', 'Edit Coupon') : t('নতুন কুপন', 'New Coupon')}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="code">{t('কুপন কোড', 'Coupon Code')} *</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="SAVE20"
                  className="font-mono"
                  required
                />
                <Button type="button" variant="outline" onClick={generateCode}>
                  {t('জেনারেট', 'Generate')}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="discount_type">{t('ডিসকাউন্ট ধরন', 'Discount Type')} *</Label>
                <Select
                  value={formData.discount_type}
                  onValueChange={(value: 'percentage' | 'fixed') => setFormData({ ...formData, discount_type: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">{t('শতাংশ (%)', 'Percentage (%)')}</SelectItem>
                    <SelectItem value="fixed">{t('নির্দিষ্ট (৳)', 'Fixed (৳)')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="discount_value">{t('ডিসকাউন্ট মান', 'Discount Value')} *</Label>
                <Input
                  id="discount_value"
                  type="number"
                  step="0.01"
                  min="0"
                  max={formData.discount_type === 'percentage' ? '100' : undefined}
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                  className="mt-1"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="minimum_order_value">{t('সর্বনিম্ন অর্ডার', 'Minimum Order')}</Label>
                <Input
                  id="minimum_order_value"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.minimum_order_value}
                  onChange={(e) => setFormData({ ...formData, minimum_order_value: e.target.value })}
                  placeholder="0"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="max_uses">{t('সর্বোচ্চ ব্যবহার', 'Max Uses')}</Label>
                <Input
                  id="max_uses"
                  type="number"
                  min="1"
                  value={formData.max_uses}
                  onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                  placeholder={t('সীমাহীন', 'Unlimited')}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>{t('মেয়াদ শেষ', 'Expiry Date')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal mt-1',
                      !formData.expires_at && 'text-muted-foreground'
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {formData.expires_at ? format(formData.expires_at, 'PPP') : t('তারিখ নির্বাচন করুন', 'Pick a date')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={formData.expires_at}
                    onSelect={(date) => setFormData({ ...formData, expires_at: date })}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded border-gray-300"
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                {t('সক্রিয় কুপন', 'Active Coupon')}
              </Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                {t('বাতিল', 'Cancel')}
              </Button>
              <Button type="submit" disabled={createCoupon.isPending || updateCoupon.isPending}>
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
            <AlertDialogTitle>
              {t('কুপন ডিলিট করুন?', 'Delete Coupon?')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                'এই কুপনটি রিসাইকেল বিনে যাবে। ৩০ দিনের মধ্যে পুনরুদ্ধার করা যাবে।',
                'This coupon will be moved to the Recycle Bin. You can restore it within 30 days.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('বাতিল', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('ডিলিট করুন', 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteIds.length > 0} onOpenChange={() => setBulkDeleteIds([])}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('নিশ্চিত করুন', 'Confirm Delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                'আপনি কি সিলেক্টেড কুপনগুলো রিসাইকেল বিনে পাঠাতে চান? ৩০ দিনের মধ্যে পুনরুদ্ধার করা যাবে।',
                'Move the selected coupons to the Recycle Bin? You can restore them within 30 days.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('বাতিল', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
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
