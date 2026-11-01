import React, { useState, useEffect, useRef } from 'react';
import { User, Phone, MapPin, Mail, Camera, Loader2, Upload } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { BANGLADESH_DIVISIONS } from '@/data/divisions';

interface Profile {
  name: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  email: string | null;
  avatar_url?: string | null;
}

interface ProfileEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile | null;
  onProfileUpdate: () => void;
}

export default function ProfileEditModal({ 
  open, 
  onOpenChange, 
  profile, 
  onProfileUpdate 
}: ProfileEditModalProps) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    email: '',
    avatar_url: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        phone: profile.phone || '',
        address: profile.address || '',
        city: profile.city || '',
        email: profile.email || user?.email || '',
        avatar_url: profile.avatar_url || '',
      });
    }
  }, [profile, user?.email]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error(t('শুধুমাত্র ছবি আপলোড করা যাবে', 'Only images can be uploaded'));
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t('ছবির সাইজ ২MB এর বেশি হতে পারবে না', 'Image size cannot exceed 2MB'));
      return;
    }

    setUploading(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
      toast.success(t('ছবি আপলোড হয়েছে', 'Photo uploaded'));
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(t('আপলোড ব্যর্থ হয়েছে', 'Upload failed'));
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    
    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    let error;
    
    const profileData = {
      name: formData.name.trim() || null,
      phone: formData.phone.trim() || null,
      address: formData.address.trim() || null,
      city: formData.city || null,
      email: formData.email.trim() || null,
      avatar_url: formData.avatar_url || null,
    };

    if (existingProfile) {
      // Update existing profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('user_id', user.id);
      error = updateError;
    } else {
      // Create new profile
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          ...profileData,
        });
      error = insertError;
    }

    setSaving(false);

    if (error) {
      toast.error(t('প্রোফাইল আপডেট ব্যর্থ হয়েছে', 'Failed to update profile'));
      console.error('Profile update error:', error);
    } else {
      toast.success(t('প্রোফাইল সফলভাবে আপডেট হয়েছে', 'Profile updated successfully'));
      onProfileUpdate();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('প্রোফাইল সম্পাদনা করুন', 'Edit Profile')}</DialogTitle>
          <DialogDescription>
            {t('আপনার তথ্য আপডেট করুন', 'Update your information')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center overflow-hidden border-4 border-background shadow-lg">
                {formData.avatar_url ? (
                  <img 
                    src={formData.avatar_url} 
                    alt="Avatar" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-12 h-12 text-muted-foreground" />
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t('ছবি পরিবর্তন করতে ক্লিক করুন', 'Click to change photo')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              {t('নাম', 'Name')}
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('আপনার নাম', 'Your name')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              {t('ফোন নম্বর', 'Phone Number')}
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="01XXXXXXXXX"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              {t('ইমেইল', 'Email')} <span className="text-muted-foreground text-xs">({t('ঐচ্ছিক', 'optional')})</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {t('জেলা', 'District')}
            </Label>
            <Select
              value={formData.city}
              onValueChange={(value) => setFormData({ ...formData, city: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('জেলা সিলেক্ট করুন', 'Select district')} />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {BANGLADESH_DIVISIONS.map((div) => (
                  <SelectItem key={div.value} value={div.value}>
                    {language === 'bn' ? div.labelBn : div.labelEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {t('সম্পূর্ণ ঠিকানা', 'Full Address')}
            </Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder={t('বাড়ি, রোড, এলাকা', 'House, Road, Area')}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('বাতিল', 'Cancel')}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t('সংরক্ষণ করুন', 'Save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
