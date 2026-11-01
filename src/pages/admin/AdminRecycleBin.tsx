 import React, { useState, useMemo, useEffect } from 'react';
 import { Trash2, RotateCcw, Clock, Package, Tag, Zap, Ticket, AlertTriangle } from 'lucide-react';
 import { useLanguage } from '@/contexts/LanguageContext';
 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import AdminLayout from '@/components/admin/AdminLayout';
 import { Button } from '@/components/ui/button';
 import { Checkbox } from '@/components/ui/checkbox';
 import {
   Tabs,
   TabsContent,
   TabsList,
   TabsTrigger,
 } from '@/components/ui/tabs';
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
 import { formatDate } from '@/lib/formatters';
 import { differenceInDays } from 'date-fns';
 
 interface DeletedItem {
   id: string;
   name_bn?: string;
   name_en?: string;
   code?: string;
   deleted_at: string;
 }
 
 export default function AdminRecycleBin() {
   const { t, language } = useLanguage();
   const queryClient = useQueryClient();
   const [activeTab, setActiveTab] = useState('products');
   const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
   const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; action: 'restore' | 'delete'; items: string[] }>({ 
     open: false, 
     action: 'restore', 
     items: [] 
   });
 
   // Fetch deleted products
   const { data: deletedProducts, refetch: refetchProducts } = useQuery({
     queryKey: ['deleted-products'],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('products')
         .select('id, name_bn, name_en, deleted_at')
         .not('deleted_at', 'is', null)
         .order('deleted_at', { ascending: false });
       if (error) throw error;
       return data as DeletedItem[];
     },
   });
 
   // Fetch deleted categories
   const { data: deletedCategories, refetch: refetchCategories } = useQuery({
     queryKey: ['deleted-categories'],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('categories')
         .select('id, name_bn, name_en, deleted_at')
         .not('deleted_at', 'is', null)
         .order('deleted_at', { ascending: false });
       if (error) throw error;
       return data as DeletedItem[];
     },
   });
 
   // Fetch deleted coupons
   const { data: deletedCoupons, refetch: refetchCoupons } = useQuery({
     queryKey: ['deleted-coupons'],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('coupons')
         .select('id, code, deleted_at')
         .not('deleted_at', 'is', null)
         .order('deleted_at', { ascending: false });
       if (error) throw error;
       return (data ?? []).map(c => ({ ...c, name_en: c.code, name_bn: c.code })) as DeletedItem[];
     },
   });
 
   // Fetch deleted flash sales
   const { data: deletedFlashSales, refetch: refetchFlashSales } = useQuery({
     queryKey: ['deleted-flash-sales'],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('flash_sales')
         .select('id, name_bn, name_en, deleted_at')
         .not('deleted_at', 'is', null)
         .order('deleted_at', { ascending: false });
       if (error) throw error;
       return data as DeletedItem[];
     },
   });
 
   const getTableName = () => {
     switch (activeTab) {
       case 'products': return 'products';
       case 'categories': return 'categories';
       case 'coupons': return 'coupons';
       case 'flash-sales': return 'flash_sales';
       default: return 'products';
     }
   };
 
   const getCurrentItems = () => {
     switch (activeTab) {
       case 'products': return deletedProducts ?? [];
       case 'categories': return deletedCategories ?? [];
       case 'coupons': return deletedCoupons ?? [];
       case 'flash-sales': return deletedFlashSales ?? [];
       default: return [];
     }
   };
 
   const refetchCurrentTab = () => {
     switch (activeTab) {
       case 'products': refetchProducts(); break;
       case 'categories': refetchCategories(); break;
       case 'coupons': refetchCoupons(); break;
       case 'flash-sales': refetchFlashSales(); break;
     }
   };
 
   // Restore mutation
   const restoreMutation = useMutation({
     mutationFn: async (ids: string[]) => {
       const tableName = getTableName();
       const { error } = await supabase
         .from(tableName)
         .update({ deleted_at: null })
         .in('id', ids);
       if (error) throw error;
     },
     onSuccess: () => {
       toast.success(t('আইটেম পুনরুদ্ধার হয়েছে', 'Items restored'));
       setSelectedItems(new Set());
       refetchCurrentTab();
       queryClient.invalidateQueries({ queryKey: ['admin-products'] });
       queryClient.invalidateQueries({ queryKey: ['products'] });
       queryClient.invalidateQueries({ queryKey: ['categories'] });
       queryClient.invalidateQueries({ queryKey: ['flash-sales'] });
     },
   });
 
   // Permanent delete mutation
   const permanentDeleteMutation = useMutation({
     mutationFn: async (ids: string[]) => {
       const tableName = getTableName();
       const { error } = await supabase
         .from(tableName)
         .delete()
         .in('id', ids);
       if (error) throw error;
     },
     onSuccess: () => {
       toast.success(t('স্থায়ীভাবে মুছে ফেলা হয়েছে', 'Permanently deleted'));
       setSelectedItems(new Set());
       refetchCurrentTab();
     },
   });
 
   const handleAction = (action: 'restore' | 'delete', items: string[]) => {
     setConfirmDialog({ open: true, action, items });
   };
 
   const confirmAction = () => {
     if (confirmDialog.action === 'restore') {
       restoreMutation.mutate(confirmDialog.items);
     } else {
       permanentDeleteMutation.mutate(confirmDialog.items);
     }
     setConfirmDialog({ open: false, action: 'restore', items: [] });
   };
 
   const toggleSelection = (id: string) => {
     const newSelected = new Set(selectedItems);
     if (newSelected.has(id)) {
       newSelected.delete(id);
     } else {
       newSelected.add(id);
     }
     setSelectedItems(newSelected);
   };
 
   const toggleSelectAll = () => {
     const items = getCurrentItems();
     if (selectedItems.size === items.length) {
       setSelectedItems(new Set());
     } else {
       setSelectedItems(new Set(items.map(i => i.id)));
     }
   };
 
   const getDaysRemaining = (deletedAt: string) => {
     const days = 30 - differenceInDays(new Date(), new Date(deletedAt));
     return Math.max(0, days);
   };
 
   const getTabIcon = (tab: string) => {
     switch (tab) {
       case 'products': return <Package className="w-4 h-4" />;
       case 'categories': return <Tag className="w-4 h-4" />;
       case 'coupons': return <Ticket className="w-4 h-4" />;
       case 'flash-sales': return <Zap className="w-4 h-4" />;
       default: return null;
     }
   };
 
   const items = getCurrentItems();
 
   // Clear selection when tab changes
   useEffect(() => {
     setSelectedItems(new Set());
   }, [activeTab]);
 
   return (
     <AdminLayout>
       <div className="space-y-6">
         <div>
           <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
             <Trash2 className="w-8 h-8 text-muted-foreground" />
             {t('রিসাইকেল বিন', 'Recycle Bin')}
           </h1>
           <p className="text-muted-foreground mt-1">
             {t('মুছে ফেলা আইটেম ৩০ দিন পর্যন্ত এখানে থাকবে', 'Deleted items will be kept here for 30 days')}
           </p>
         </div>
 
         {/* Warning Banner */}
         <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl p-4 flex items-start gap-3">
           <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
           <div>
             <p className="font-medium text-amber-700 dark:text-amber-400">
               {t('স্বয়ংক্রিয় মুছে ফেলা', 'Automatic Deletion')}
             </p>
             <p className="text-sm text-amber-600 dark:text-amber-500">
               {t('৩০ দিন পর আইটেমগুলো স্থায়ীভাবে মুছে যাবে এবং পুনরুদ্ধার করা সম্ভব হবে না।', 
                  'Items will be permanently deleted after 30 days and cannot be recovered.')}
             </p>
           </div>
         </div>
 
         <Tabs value={activeTab} onValueChange={setActiveTab}>
           <TabsList className="grid w-full grid-cols-4">
             <TabsTrigger value="products" className="flex items-center gap-2">
               {getTabIcon('products')}
               <span className="hidden sm:inline">{t('পণ্য', 'Products')}</span>
               {(deletedProducts?.length ?? 0) > 0 && (
                 <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded-full">{deletedProducts?.length}</span>
               )}
             </TabsTrigger>
             <TabsTrigger value="categories" className="flex items-center gap-2">
               {getTabIcon('categories')}
               <span className="hidden sm:inline">{t('ক্যাটাগরি', 'Categories')}</span>
               {(deletedCategories?.length ?? 0) > 0 && (
                 <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded-full">{deletedCategories?.length}</span>
               )}
             </TabsTrigger>
             <TabsTrigger value="coupons" className="flex items-center gap-2">
               {getTabIcon('coupons')}
               <span className="hidden sm:inline">{t('কুপন', 'Coupons')}</span>
               {(deletedCoupons?.length ?? 0) > 0 && (
                 <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded-full">{deletedCoupons?.length}</span>
               )}
             </TabsTrigger>
             <TabsTrigger value="flash-sales" className="flex items-center gap-2">
               {getTabIcon('flash-sales')}
               <span className="hidden sm:inline">{t('ফ্ল্যাশ সেল', 'Flash Sales')}</span>
               {(deletedFlashSales?.length ?? 0) > 0 && (
                 <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded-full">{deletedFlashSales?.length}</span>
               )}
             </TabsTrigger>
           </TabsList>
 
           {/* Bulk Actions */}
           {selectedItems.size > 0 && (
             <div className="flex items-center gap-2 mt-4 p-3 bg-muted rounded-lg">
               <span className="text-sm font-medium">
                 {selectedItems.size} {t('টি সিলেক্ট করা হয়েছে', 'selected')}
               </span>
               <div className="flex-1" />
               <Button
                 size="sm"
                 variant="outline"
                 onClick={() => handleAction('restore', Array.from(selectedItems))}
               >
                 <RotateCcw className="w-4 h-4 mr-2" />
                 {t('পুনরুদ্ধার', 'Restore')}
               </Button>
               <Button
                 size="sm"
                 variant="destructive"
                 onClick={() => handleAction('delete', Array.from(selectedItems))}
               >
                 <Trash2 className="w-4 h-4 mr-2" />
                 {t('স্থায়ী মুছুন', 'Delete Permanently')}
               </Button>
             </div>
           )}
 
           <TabsContent value={activeTab} className="mt-4">
             {items.length === 0 ? (
               <div className="text-center py-12 bg-muted/50 rounded-xl">
                 <Trash2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                 <p className="text-muted-foreground">
                   {t('কোন মুছে ফেলা আইটেম নেই', 'No deleted items')}
                 </p>
               </div>
             ) : (
               <div className="bg-card border rounded-xl overflow-hidden">
                 <table className="w-full">
                   <thead className="bg-secondary/50">
                     <tr>
                       <th className="p-4 text-left w-12">
                         <Checkbox
                           checked={selectedItems.size === items.length && items.length > 0}
                           onCheckedChange={toggleSelectAll}
                         />
                       </th>
                       <th className="p-4 text-left text-sm font-medium">{t('নাম', 'Name')}</th>
                       <th className="p-4 text-left text-sm font-medium hidden md:table-cell">{t('মুছে ফেলার তারিখ', 'Deleted Date')}</th>
                       <th className="p-4 text-left text-sm font-medium">{t('বাকি দিন', 'Days Left')}</th>
                       <th className="p-4 text-right text-sm font-medium">{t('অ্যাকশন', 'Actions')}</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y">
                     {items.map((item) => (
                       <tr key={item.id} className="hover:bg-secondary/30">
                         <td className="p-4">
                           <Checkbox
                             checked={selectedItems.has(item.id)}
                             onCheckedChange={() => toggleSelection(item.id)}
                           />
                         </td>
                         <td className="p-4">
                           <p className="font-medium">
                             {language === 'bn' ? item.name_bn : item.name_en}
                           </p>
                         </td>
                         <td className="p-4 text-sm text-muted-foreground hidden md:table-cell">
                           {item.deleted_at && formatDate(item.deleted_at, language)}
                         </td>
                         <td className="p-4">
                           <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                             getDaysRemaining(item.deleted_at) <= 7 
                               ? 'bg-destructive/10 text-destructive' 
                               : 'bg-muted text-muted-foreground'
                           }`}>
                             <Clock className="w-3 h-3" />
                             {getDaysRemaining(item.deleted_at)} {t('দিন', 'days')}
                           </span>
                         </td>
                         <td className="p-4 text-right">
                           <div className="flex items-center justify-end gap-2">
                             <Button
                               size="sm"
                               variant="ghost"
                               onClick={() => handleAction('restore', [item.id])}
                             >
                               <RotateCcw className="w-4 h-4" />
                             </Button>
                             <Button
                               size="sm"
                               variant="ghost"
                               className="text-destructive hover:text-destructive"
                               onClick={() => handleAction('delete', [item.id])}
                             >
                               <Trash2 className="w-4 h-4" />
                             </Button>
                           </div>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             )}
           </TabsContent>
         </Tabs>
       </div>
 
       {/* Confirmation Dialog */}
       <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>
               {confirmDialog.action === 'restore' 
                 ? t('পুনরুদ্ধার করতে চান?', 'Restore items?')
                 : t('স্থায়ীভাবে মুছে ফেলতে চান?', 'Permanently delete?')}
             </AlertDialogTitle>
             <AlertDialogDescription>
               {confirmDialog.action === 'restore'
                 ? t('নির্বাচিত আইটেমগুলো পুনরুদ্ধার করা হবে।', 'Selected items will be restored.')
                 : t('এই ক্রিয়াটি পূর্বাবস্থায় ফেরানো যাবে না। আইটেমগুলো চিরতরে মুছে যাবে।', 
                     'This action cannot be undone. Items will be permanently deleted.')}
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel>{t('বাতিল', 'Cancel')}</AlertDialogCancel>
             <AlertDialogAction
               onClick={confirmAction}
               className={confirmDialog.action === 'delete' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
             >
               {confirmDialog.action === 'restore' ? t('পুনরুদ্ধার', 'Restore') : t('মুছুন', 'Delete')}
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>
     </AdminLayout>
   );
 }