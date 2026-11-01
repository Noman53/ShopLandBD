import React, { useState, useMemo } from 'react';
import { Truck, Plus, Edit2, Trash2, Loader2, Check, X, Search } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFreeDeliveryRules, useCreateFreeDeliveryRule, useUpdateFreeDeliveryRule, useDeleteFreeDeliveryRule, FreeDeliveryRule } from '@/hooks/useFreeDeliveryRules';
import { useAdminProducts } from '@/hooks/useAdmin';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { formatPrice } from '@/lib/formatters';

function ProductSelectionWithSearch({ products, selectedIds, onToggle, language, t }: {
  products: any[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  language: string;
  t: (bn: string, en: string) => string;
}) {
  const [search, setSearch] = useState('');

  const sorted = useMemo(() => {
    const filtered = products.filter(p => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return p.name_en.toLowerCase().includes(q) || p.name_bn.toLowerCase().includes(q);
    });
    return filtered.sort((a: any, b: any) => {
      const nameA = language === 'bn' ? a.name_bn : a.name_en;
      const nameB = language === 'bn' ? b.name_bn : b.name_en;
      return nameA.localeCompare(nameB);
    });
  }, [products, search, language]);

  return (
    <div>
      <Label className="mb-2 block">{t('পণ্য নির্বাচন', 'Select Products')}</Label>
      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('পণ্য খুঁজুন...', 'Search products...')}
          className="pl-9"
        />
      </div>
      {selectedIds.length > 0 && (
        <p className="text-xs text-muted-foreground mb-1">{selectedIds.length} {t('নির্বাচিত', 'selected')}</p>
      )}
      <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">{t('কোন পণ্য পাওয়া যায়নি', 'No products found')}</p>
        ) : sorted.map((p: any) => (
          <label key={p.id} className="flex items-center gap-2 p-2 rounded hover:bg-secondary/50 cursor-pointer">
            <Checkbox
              checked={selectedIds.includes(p.id)}
              onCheckedChange={() => onToggle(p.id)}
            />
            <span className="text-sm">{language === 'bn' ? p.name_bn : p.name_en}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function AdminFreeDelivery() {
  const { t, language } = useLanguage();
  const { data: rules, isLoading } = useFreeDeliveryRules();
  const { data: products } = useAdminProducts();
  const createRule = useCreateFreeDeliveryRule();
  const updateRule = useUpdateFreeDeliveryRule();
  const deleteRule = useDeleteFreeDeliveryRule();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<FreeDeliveryRule | null>(null);

  const [form, setForm] = useState({
    name_bn: '',
    name_en: '',
    is_active: true,
    applies_to: 'all' as 'all' | 'selected',
    delivery_area: 'both' as 'dhaka' | 'outside_dhaka' | 'both',
    trigger_type: 'min_amount' as 'min_amount' | 'coupon',
    min_order_amount: 0,
    coupon_code: '',
    product_ids: [] as string[],
  });

  const resetForm = () => {
    setForm({
      name_bn: '', name_en: '', is_active: true, applies_to: 'all',
      delivery_area: 'both', trigger_type: 'min_amount', min_order_amount: 0,
      coupon_code: '', product_ids: [],
    });
    setEditingRule(null);
  };

  const openEdit = (rule: FreeDeliveryRule) => {
    setEditingRule(rule);
    setForm({
      name_bn: rule.name_bn, name_en: rule.name_en, is_active: rule.is_active,
      applies_to: rule.applies_to, delivery_area: rule.delivery_area,
      trigger_type: rule.trigger_type, min_order_amount: rule.min_order_amount,
      coupon_code: rule.coupon_code || '', product_ids: rule.product_ids || [],
    });
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name_en.trim()) {
      toast.error(t('নাম প্রয়োজন', 'Name is required'));
      return;
    }
    try {
      const payload = {
        ...form,
        coupon_code: form.trigger_type === 'coupon' ? form.coupon_code : null,
        product_ids: form.applies_to === 'selected' ? form.product_ids : [],
      };

      if (editingRule) {
        await updateRule.mutateAsync({ id: editingRule.id, ...payload });
        toast.success(t('রুল আপডেট হয়েছে', 'Rule updated'));
      } else {
        await createRule.mutateAsync(payload);
        toast.success(t('রুল তৈরি হয়েছে', 'Rule created'));
      }
      setIsFormOpen(false);
      resetForm();
    } catch (error) {
      toast.error(t('ত্রুটি হয়েছে', 'Error occurred'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('আপনি কি নিশ্চিত?', 'Are you sure?'))) return;
    try {
      await deleteRule.mutateAsync(id);
      toast.success(t('রুল মুছে ফেলা হয়েছে', 'Rule deleted'));
    } catch (error) {
      toast.error(t('ত্রুটি হয়েছে', 'Error occurred'));
    }
  };

  const handleToggle = async (rule: FreeDeliveryRule) => {
    await updateRule.mutateAsync({ id: rule.id, is_active: !rule.is_active });
    toast.success(rule.is_active ? t('নিষ্ক্রিয় হয়েছে', 'Deactivated') : t('সক্রিয় হয়েছে', 'Activated'));
  };

  const toggleProductSelection = (productId: string) => {
    setForm(prev => ({
      ...prev,
      product_ids: prev.product_ids.includes(productId)
        ? prev.product_ids.filter(id => id !== productId)
        : [...prev.product_ids, productId],
    }));
  };

  const getAreaLabel = (area: string) => {
    switch (area) {
      case 'dhaka': return t('ঢাকার ভিতরে', 'Inside Dhaka');
      case 'outside_dhaka': return t('ঢাকার বাইরে', 'Outside Dhaka');
      case 'both': return t('উভয়', 'Both');
      default: return area;
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{t('ফ্রি ডেলিভারি', 'Free Delivery')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('ফ্রি ডেলিভারি রুলস ম্যানেজ করুন', 'Manage free delivery rules')}
            </p>
          </div>
          <Button onClick={() => { resetForm(); setIsFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            {t('রুল যোগ করুন', 'Add Rule')}
          </Button>
        </div>

        {/* Rules List */}
        <div className="space-y-4">
          {(!rules || rules.length === 0) ? (
            <div className="text-center py-12 bg-card border rounded-xl">
              <Truck className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">{t('কোন রুল নেই', 'No rules yet')}</p>
            </div>
          ) : rules.map(rule => (
            <div key={rule.id} className="bg-card border rounded-xl p-4 md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold">{language === 'bn' ? rule.name_bn || rule.name_en : rule.name_en}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${rule.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {rule.is_active ? t('সক্রিয়', 'Active') : t('নিষ্ক্রিয়', 'Inactive')}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                    <span className="bg-secondary px-2 py-0.5 rounded">{getAreaLabel(rule.delivery_area)}</span>
                    <span className="bg-secondary px-2 py-0.5 rounded">
                      {rule.trigger_type === 'min_amount'
                        ? `${t('সর্বনিম্ন:', 'Min:')} ${formatPrice(rule.min_order_amount, language)}`
                        : `${t('কুপন:', 'Coupon:')} ${rule.coupon_code}`}
                    </span>
                    <span className="bg-secondary px-2 py-0.5 rounded">
                      {rule.applies_to === 'all' ? t('সব পণ্য', 'All Products') : `${rule.product_ids?.length || 0} ${t('পণ্য', 'products')}`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={rule.is_active} onCheckedChange={() => handleToggle(rule)} />
                  <Button variant="ghost" size="icon" onClick={() => openEdit(rule)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(rule.id)} className="text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRule ? t('রুল সম্পাদনা', 'Edit Rule') : t('নতুন রুল', 'New Rule')}</DialogTitle>
            <DialogDescription>{t('ফ্রি ডেলিভারি রুল কনফিগার করুন', 'Configure free delivery rule')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('নাম (ইংরেজি)', 'Name (English)')}</Label>
                <Input value={form.name_en} onChange={e => setForm({ ...form, name_en: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>{t('নাম (বাংলা)', 'Name (Bangla)')}</Label>
                <Input value={form.name_bn} onChange={e => setForm({ ...form, name_bn: e.target.value })} className="mt-1" />
              </div>
            </div>

            <div>
              <Label>{t('ডেলিভারি এরিয়া', 'Delivery Area')}</Label>
              <Select value={form.delivery_area} onValueChange={v => setForm({ ...form, delivery_area: v as any })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dhaka">{t('ঢাকার ভিতরে', 'Inside Dhaka')}</SelectItem>
                  <SelectItem value="outside_dhaka">{t('ঢাকার বাইরে', 'Outside Dhaka')}</SelectItem>
                  <SelectItem value="both">{t('উভয়', 'Both')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t('ট্রিগার টাইপ', 'Trigger Type')}</Label>
              <Select value={form.trigger_type} onValueChange={v => setForm({ ...form, trigger_type: v as any })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="min_amount">{t('সর্বনিম্ন অর্ডার', 'Minimum Order Amount')}</SelectItem>
                  <SelectItem value="coupon">{t('কুপন কোড', 'Coupon Code')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.trigger_type === 'min_amount' && (
              <div>
                <Label>{t('সর্বনিম্ন অর্ডার (টাকা)', 'Minimum Order (BDT)')}</Label>
                <Input type="number" value={form.min_order_amount} onChange={e => setForm({ ...form, min_order_amount: parseFloat(e.target.value) || 0 })} className="mt-1" />
              </div>
            )}

            {form.trigger_type === 'coupon' && (
              <div>
                <Label>{t('কুপন কোড', 'Coupon Code')}</Label>
                <Input value={form.coupon_code} onChange={e => setForm({ ...form, coupon_code: e.target.value.toUpperCase() })} className="mt-1" placeholder="FREESHIP" />
              </div>
            )}

            <div>
              <Label>{t('প্রযোজ্য পণ্য', 'Applies To')}</Label>
              <Select value={form.applies_to} onValueChange={v => setForm({ ...form, applies_to: v as any })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('সব পণ্য', 'All Products')}</SelectItem>
                  <SelectItem value="selected">{t('নির্বাচিত পণ্য', 'Selected Products')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.applies_to === 'selected' && products && (
              <ProductSelectionWithSearch
                products={products}
                selectedIds={form.product_ids}
                onToggle={toggleProductSelection}
                language={language}
                t={t}
              />
            )}

            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
              <Label>{t('সক্রিয়', 'Active')}</Label>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setIsFormOpen(false); resetForm(); }}>
              {t('বাতিল', 'Cancel')}
            </Button>
            <Button onClick={handleSave} disabled={createRule.isPending || updateRule.isPending}>
              {(createRule.isPending || updateRule.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingRule ? t('আপডেট', 'Update') : t('তৈরি করুন', 'Create')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
