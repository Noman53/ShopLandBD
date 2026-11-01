import React, { useState, useEffect } from 'react';
import { Save, Loader2, Upload, ImageIcon, Trash2, Truck, Power, MessageSquare } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useStoreSettings, useUpdateStoreSetting } from '@/hooks/useAdmin';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function AdminSettings() {
  const { t } = useLanguage();
  const { data: settings, isLoading } = useStoreSettings();
  const updateSetting = useUpdateStoreSetting();

  const [formData, setFormData] = useState({
    bkash_merchant_number: '',
    bkash_qr_code_url: '',
    store_name: '',
    store_phone: '',
    store_email: '',
    store_address: '',
    store_logo: '',
    delivery_charge_dhaka: '70',
    delivery_charge_outside_dhaka: '120',
    maintenance_mode: false,
    review_auto_approve: true,
  });
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({
        bkash_merchant_number: settings.bkash_merchant_number || '',
        bkash_qr_code_url: settings.bkash_qr_code_url || '',
        store_name: settings.store_name || '',
        store_phone: settings.store_phone || '',
        store_email: settings.store_email || '',
        store_address: settings.store_address || '',
        store_logo: settings.store_logo || '',
        delivery_charge_dhaka: settings.delivery_charge_dhaka || '70',
        delivery_charge_outside_dhaka: settings.delivery_charge_outside_dhaka || '120',
        maintenance_mode: settings.maintenance_mode === 'true',
        review_auto_approve: settings.review_auto_approve !== 'false', // default true
      });
    }
  }, [settings]);

  const handleQRUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      const fileName = `bkash-qr-${Date.now()}.${fileExt}`;
      const filePath = `settings/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      const qrUrl = publicUrl.publicUrl;
      setFormData({ ...formData, bkash_qr_code_url: qrUrl });
      
      // Save to settings
      await updateSetting.mutateAsync({ key: 'bkash_qr_code_url', value: qrUrl });
      toast.success(t('QR কোড আপলোড হয়েছে', 'QR code uploaded'));
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(t('QR কোড আপলোড ব্যর্থ হয়েছে', 'QR code upload failed'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(t('শুধুমাত্র ছবি আপলোড করুন', 'Please upload only images'));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t('ছবির সাইজ ২MB এর বেশি হতে পারবে না', 'Image size should not exceed 2MB'));
      return;
    }
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `store-logo-${Date.now()}.${fileExt}`;
      const filePath = `settings/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('product-images').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: publicUrl } = supabase.storage.from('product-images').getPublicUrl(filePath);
      const logoUrl = publicUrl.publicUrl;
      setFormData({ ...formData, store_logo: logoUrl });
      await updateSetting.mutateAsync({ key: 'store_logo', value: logoUrl });
      toast.success(t('লোগো আপলোড হয়েছে', 'Logo uploaded'));
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(t('লোগো আপলোড ব্যর্থ', 'Logo upload failed'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    setFormData({ ...formData, store_logo: '' });
    await updateSetting.mutateAsync({ key: 'store_logo', value: '' });
    toast.success(t('লোগো সরানো হয়েছে', 'Logo removed'));
  };

  const handleRemoveQR = async () => {
    setFormData({ ...formData, bkash_qr_code_url: '' });
    await updateSetting.mutateAsync({ key: 'bkash_qr_code_url', value: '' });
    toast.success(t('QR কোড সরানো হয়েছে', 'QR code removed'));
  };

  const handleReviewAutoApproveToggle = async (enabled: boolean) => {
    setFormData({ ...formData, review_auto_approve: enabled });
    await updateSetting.mutateAsync({ key: 'review_auto_approve', value: enabled ? 'true' : 'false' });
    toast.success(enabled 
      ? t('রিভিউ স্বয়ংক্রিয় অনুমোদন চালু', 'Review auto-approval enabled')
      : t('রিভিউ ম্যানুয়াল অনুমোদন চালু', 'Manual review approval enabled')
    );
  };

  const handleMaintenanceToggle = async (enabled: boolean) => {
    setFormData({ ...formData, maintenance_mode: enabled });
    await updateSetting.mutateAsync({ key: 'maintenance_mode', value: enabled ? 'true' : 'false' });
    toast.success(enabled ? t('মেইনটেনেন্স মোড চালু হয়েছে', 'Maintenance mode enabled') : t('মেইনটেনেন্স মোড বন্ধ হয়েছে', 'Maintenance mode disabled'));
  };

  const handleSaveAll = async () => {
    try {
      await Promise.all([
        updateSetting.mutateAsync({ key: 'bkash_merchant_number', value: formData.bkash_merchant_number }),
        updateSetting.mutateAsync({ key: 'store_name', value: formData.store_name }),
        updateSetting.mutateAsync({ key: 'store_phone', value: formData.store_phone }),
        updateSetting.mutateAsync({ key: 'store_email', value: formData.store_email }),
        updateSetting.mutateAsync({ key: 'store_address', value: formData.store_address }),
        updateSetting.mutateAsync({ key: 'delivery_charge_dhaka', value: formData.delivery_charge_dhaka }),
        updateSetting.mutateAsync({ key: 'delivery_charge_outside_dhaka', value: formData.delivery_charge_outside_dhaka }),
      ]);
      toast.success(t('সব সেটিংস সেভ হয়েছে', 'All settings saved'));
    } catch (error) {
      toast.error(t('ত্রুটি হয়েছে', 'Error occurred'));
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
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            {t('সেটিংস', 'Settings')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('স্টোরের কনফিগারেশন সেটিংস', 'Store configuration settings')}
          </p>
        </div>

        {/* Maintenance Mode Toggle */}
        <div className="bg-card border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${formData.maintenance_mode ? 'bg-destructive/10' : 'bg-green-100 dark:bg-green-900/30'}`}>
                <Power className={`w-5 h-5 ${formData.maintenance_mode ? 'text-destructive' : 'text-green-600 dark:text-green-400'}`} />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{t('ওয়েবসাইট স্ট্যাটাস', 'Website Status')}</h2>
                <p className="text-sm text-muted-foreground">
                  {formData.maintenance_mode
                    ? t('ওয়েবসাইট বর্তমানে বন্ধ আছে', 'Website is currently offline')
                    : t('ওয়েবসাইট সচল আছে', 'Website is live')}
                </p>
              </div>
            </div>
            <Switch
              checked={formData.maintenance_mode}
              onCheckedChange={handleMaintenanceToggle}
            />
          </div>
          {formData.maintenance_mode && (
            <p className="mt-3 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              {t('⚠️ মেইনটেনেন্স মোড চালু আছে। ব্যবহারকারীরা সাইটে প্রবেশ করতে পারবে না। শুধুমাত্র অ্যাডমিন প্যানেল অ্যাক্সেসযোগ্য।',
                '⚠️ Maintenance mode is ON. Users cannot access the site. Only the admin panel is accessible.')}
            </p>
          )}
        </div>

        {/* Review Auto-Approval Toggle */}
        <div className="bg-card border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${formData.review_auto_approve ? 'bg-green-100 dark:bg-green-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'}`}>
                <MessageSquare className={`w-5 h-5 ${formData.review_auto_approve ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`} />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{t('রিভিউ অনুমোদন', 'Review Approval')}</h2>
                <p className="text-sm text-muted-foreground">
                  {formData.review_auto_approve
                    ? t('রিভিউ স্বয়ংক্রিয়ভাবে অনুমোদিত হবে', 'Reviews will be auto-approved')
                    : t('রিভিউ ম্যানুয়ালি অনুমোদন করতে হবে', 'Reviews require manual approval')}
                </p>
              </div>
            </div>
            <Switch
              checked={formData.review_auto_approve}
              onCheckedChange={handleReviewAutoApproveToggle}
            />
          </div>
        </div>

        {/* Delivery Charge Settings */}
        <div className="bg-card border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            {t('ডেলিভারি চার্জ', 'Delivery Charges')}
          </h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="delivery_charge_dhaka">
                {t('ঢাকার ভিতরে (টাকা)', 'Inside Dhaka (BDT)')}
              </Label>
              <Input
                id="delivery_charge_dhaka"
                type="number"
                value={formData.delivery_charge_dhaka}
                onChange={(e) => setFormData({ ...formData, delivery_charge_dhaka: e.target.value })}
                placeholder="70"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="delivery_charge_outside_dhaka">
                {t('ঢাকার বাইরে (টাকা)', 'Outside Dhaka (BDT)')}
              </Label>
              <Input
                id="delivery_charge_outside_dhaka"
                type="number"
                value={formData.delivery_charge_outside_dhaka}
                onChange={(e) => setFormData({ ...formData, delivery_charge_outside_dhaka: e.target.value })}
                placeholder="120"
                className="mt-1"
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {t(
              'এই চার্জ চেকআউটে জেলা অনুযায়ী যোগ হবে',
              'These charges will be added at checkout based on district'
            )}
          </p>
        </div>

        {/* bKash Settings */}
        <div className="bg-card border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-bkash flex items-center justify-center text-white text-sm font-bold">b</span>
            {t('বিকাশ সেটিংস', 'bKash Settings')}
          </h2>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="bkash_merchant_number">
                {t('বিকাশ মার্চেন্ট নম্বর', 'bKash Merchant Number')}
              </Label>
              <Input
                id="bkash_merchant_number"
                value={formData.bkash_merchant_number}
                onChange={(e) => setFormData({ ...formData, bkash_merchant_number: e.target.value })}
                placeholder="01XXXXXXXXX"
                className="mt-1"
              />
              <p className="text-sm text-muted-foreground mt-1">
                {t(
                  'এই নম্বরটি চেকআউট পেজে গ্রাহকদের দেখানো হবে',
                  'This number will be shown to customers on the checkout page'
                )}
              </p>
            </div>

            {/* bKash QR Code Upload */}
            <div>
              <Label>{t('বিকাশ QR কোড', 'bKash QR Code')}</Label>
              <div className="mt-2 flex items-start gap-4">
                <div className="w-32 h-32 rounded-lg bg-secondary flex items-center justify-center overflow-hidden border-2 border-dashed border-border">
                  {formData.bkash_qr_code_url ? (
                    <img src={formData.bkash_qr_code_url} alt="bKash QR" className="w-full h-full object-contain" />
                  ) : (
                    <ImageIcon className="w-10 h-10 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleQRUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                    <Button type="button" variant="outline" size="sm" disabled={isUploading} asChild>
                      <span>
                        <Upload className="w-4 h-4 mr-2" />
                        {isUploading ? t('আপলোড হচ্ছে...', 'Uploading...') : t('QR কোড আপলোড', 'Upload QR Code')}
                      </span>
                    </Button>
                  </label>
                  {formData.bkash_qr_code_url && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleRemoveQR}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t('QR সরান', 'Remove QR')}
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {t(
                      'গ্রাহকরা চেকআউটে এই QR স্ক্যান করে পেমেন্ট করতে পারবে',
                      'Customers can scan this QR to make payment at checkout'
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Store Info */}
        <div className="bg-card border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">
            {t('স্টোর তথ্য', 'Store Information')}
          </h2>
          
          <div className="space-y-4">
            {/* Store Logo */}
            <div>
              <Label>{t('স্টোর লোগো', 'Store Logo')}</Label>
              <div className="mt-2 flex items-center gap-4">
                {formData.store_logo ? (
                  <div className="relative">
                    <img src={formData.store_logo} alt="Store Logo" className="h-16 w-auto object-contain rounded border" />
                    <Button variant="ghost" size="sm" onClick={handleRemoveLogo} className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors">
                    <Upload className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{t('লোগো আপলোড করুন', 'Upload Logo')}</span>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={isUploading} />
                  </label>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('ইনভয়েসে এই লোগো দেখাবে', 'This logo will appear on invoices')}
              </p>
            </div>

            <div>
              <Label htmlFor="store_name">{t('স্টোরের নাম', 'Store Name')}</Label>
              <Input
                id="store_name"
                value={formData.store_name}
                onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                placeholder={t('স্টোরের নাম লিখুন', 'Enter store name')}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="store_phone">{t('স্টোরের ফোন', 'Store Phone')}</Label>
              <Input
                id="store_phone"
                value={formData.store_phone}
                onChange={(e) => setFormData({ ...formData, store_phone: e.target.value })}
                placeholder="01XXXXXXXXX"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="store_email">{t('স্টোরের ইমেইল', 'Store Email')}</Label>
              <Input
                id="store_email"
                type="email"
                value={formData.store_email}
                onChange={(e) => setFormData({ ...formData, store_email: e.target.value })}
                placeholder="info@example.com"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="store_address">{t('স্টোরের ঠিকানা', 'Store Address')}</Label>
              <Input
                id="store_address"
                value={formData.store_address}
                onChange={(e) => setFormData({ ...formData, store_address: e.target.value })}
                placeholder={t('স্টোরের ঠিকানা লিখুন', 'Enter store address')}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSaveAll} disabled={updateSetting.isPending}>
            {updateSetting.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {t('সব সেভ করুন', 'Save All')}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
