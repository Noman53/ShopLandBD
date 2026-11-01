import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Wrench } from 'lucide-react';

export default function MaintenanceMode() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-lg">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
          <Wrench className="w-12 h-12 text-primary" />
        </div>
        <h1 className="text-3xl font-bold mb-4">
          {t('সাময়িকভাবে বন্ধ আছে', 'Temporarily Unavailable')}
        </h1>
        <p className="text-muted-foreground text-lg mb-6">
          {t(
            'বর্তমানে রক্ষণাবেক্ষণের কারণে আমরা সাময়িকভাবে বন্ধ আছি। শীঘ্রই ফিরে আসব। আপনার ধৈর্যের জন্য ধন্যবাদ।',
            'Currently, we are temporarily unavailable due to maintenance. We will be back shortly. Thank you for your patience.'
          )}
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
          {t('রক্ষণাবেক্ষণ চলছে...', 'Maintenance in progress...')}
        </div>
      </div>
    </div>
  );
}
