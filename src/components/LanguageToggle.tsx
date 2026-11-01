import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center bg-secondary rounded-full p-0.5">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setLanguage('bn')}
        className={`h-6 md:h-7 px-2 md:px-3 rounded-full text-[11px] md:text-xs font-medium transition-all ${
          language === 'bn'
            ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
        }`}
      >
        বাং
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setLanguage('en')}
        className={`h-6 md:h-7 px-2 md:px-3 rounded-full text-[11px] md:text-xs font-medium transition-all ${
          language === 'en'
            ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
        }`}
      >
        EN
      </Button>
    </div>
  );
}
