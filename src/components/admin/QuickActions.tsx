import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Tag, 
  Percent, 
  Zap, 
  FileDown, 
  Settings,
  Package,
  ShoppingBag,
  LayoutGrid
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';

export function QuickActions() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const actions = [
    {
      icon: Plus,
      label: t('পণ্য যোগ', 'Add Product'),
      onClick: () => navigate('/admin/products?action=add'),
      color: 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20',
    },
    {
      icon: Tag,
      label: t('ক্যাটেগরি', 'Categories'),
      onClick: () => navigate('/admin/categories'),
      color: 'bg-purple-500/10 text-purple-600 hover:bg-purple-500/20',
    },
    {
      icon: Percent,
      label: t('কুপন', 'Coupons'),
      onClick: () => navigate('/admin/coupons'),
      color: 'bg-green-500/10 text-green-600 hover:bg-green-500/20',
    },
    {
      icon: Zap,
      label: t('ফ্ল্যাশ সেল', 'Flash Sale'),
      onClick: () => navigate('/admin/flash-sales'),
      color: 'bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20',
    },
    {
      icon: ShoppingBag,
      label: t('অর্ডার', 'Orders'),
      onClick: () => navigate('/admin/orders'),
      color: 'bg-orange-500/10 text-orange-600 hover:bg-orange-500/20',
    },
    {
      icon: Settings,
      label: t('সেটিংস', 'Settings'),
      onClick: () => navigate('/admin/settings'),
      color: 'bg-slate-500/10 text-slate-600 hover:bg-slate-500/20',
    },
  ];

  return (
    <div className="bg-card border rounded-xl p-4 md:p-6">
      <h3 className="font-semibold mb-4">{t('দ্রুত অ্যাকশন', 'Quick Actions')}</h3>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${action.color}`}
          >
            <action.icon className="w-5 h-5" />
            <span className="text-xs font-medium text-center">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function FloatingQuickActions() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="fixed bottom-20 right-4 md:hidden z-50">
      {isOpen && (
        <div className="absolute bottom-16 right-0 bg-card border rounded-xl shadow-xl p-3 space-y-2 animate-in slide-in-from-bottom-2 fade-in duration-200">
          <Button
            size="sm"
            variant="ghost"
            className="w-full justify-start gap-2"
            onClick={() => {
              navigate('/admin/products?action=add');
              setIsOpen(false);
            }}
          >
            <Plus className="w-4 h-4" />
            {t('পণ্য যোগ', 'Add Product')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="w-full justify-start gap-2"
            onClick={() => {
              navigate('/admin/orders');
              setIsOpen(false);
            }}
          >
            <ShoppingBag className="w-4 h-4" />
            {t('অর্ডার', 'Orders')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="w-full justify-start gap-2"
            onClick={() => {
              navigate('/admin/flash-sales');
              setIsOpen(false);
            }}
          >
            <Zap className="w-4 h-4" />
            {t('ফ্ল্যাশ সেল', 'Flash Sale')}
          </Button>
        </div>
      )}
      <Button
        size="icon"
        className="w-14 h-14 rounded-full shadow-lg"
        onClick={() => setIsOpen(!isOpen)}
      >
        <LayoutGrid className={`w-6 h-6 transition-transform ${isOpen ? 'rotate-45' : ''}`} />
      </Button>
    </div>
  );
}
