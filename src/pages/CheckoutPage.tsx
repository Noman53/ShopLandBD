import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Truck, Wallet, Loader2, AlertTriangle, Tag, Check, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useStoreSettings } from '@/hooks/useAdmin';
import { useStockManagement } from '@/hooks/useStockManagement';
import { useValidateCoupon } from '@/hooks/useCoupons';
import { useActiveFreeDeliveryRules, checkFreeDelivery } from '@/hooks/useFreeDeliveryRules';
import { formatPrice } from '@/lib/formatters';
import { normalizeBDPhone, isValidBDPhone } from '@/lib/validation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BANGLADESH_DIVISIONS, isDhakaArea } from '@/data/divisions';
import SEO from '@/components/SEO';

type PaymentMethod = 'cod' | 'bkash';

interface CustomerInfo {
  name: string;
  phone: string;
  division: string;
  address: string;
  email: string;
}

interface BkashInfo {
  senderNumber: string;
  transactionId: string;
  paidAmount: string;
}

interface AppliedCoupon {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountAmount: number;
}

export default function CheckoutPage() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: settings } = useStoreSettings();
  const { checkStock } = useStockManagement();
  const validateCoupon = useValidateCoupon();
  const { data: freeDeliveryRules } = useActiveFreeDeliveryRules();

  const deliveryChargeDhaka = parseInt(settings?.delivery_charge_dhaka || '70');
  const deliveryChargeOutside = parseInt(settings?.delivery_charge_outside_dhaka || '120');
  const bkashNumber = settings?.bkash_merchant_number || '01XXXXXXXXX';
  const bkashQrCode = settings?.bkash_qr_code_url;

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);
  const [isCheckingStock, setIsCheckingStock] = useState(false);

  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    phone: '',
    division: '',
    address: '',
    email: '',
  });

  const [bkashInfo, setBkashInfo] = useState<BkashInfo>({
    senderNumber: '',
    transactionId: '',
    paidAmount: '',
  });

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Check if free delivery applies
  const cartProductIds = useMemo(() => items.map(i => i.productId), [items]);
  
  const isFreeDelivery = useMemo(() => {
    if (!freeDeliveryRules || !customerInfo.division) return false;
    const isDhaka = isDhakaArea(customerInfo.division);
    return checkFreeDelivery(freeDeliveryRules, subtotal, isDhaka, appliedCoupon?.code || null, cartProductIds);
  }, [freeDeliveryRules, subtotal, customerInfo.division, appliedCoupon, cartProductIds]);

  // Calculate delivery charge based on selected division
  const deliveryCharge = useMemo(() => {
    if (!customerInfo.division) return 0;
    if (isFreeDelivery) return 0;
    return isDhakaArea(customerInfo.division) ? deliveryChargeDhaka : deliveryChargeOutside;
  }, [customerInfo.division, deliveryChargeDhaka, deliveryChargeOutside, isFreeDelivery]);

  // Calculate totals
  const discountAmount = appliedCoupon?.discountAmount || 0;
  const total = Math.max(0, subtotal - discountAmount + deliveryCharge);

  // Check for payment amount mismatch
  const paymentMismatch = bkashInfo.paidAmount &&
    Math.abs(parseFloat(bkashInfo.paidAmount) - total) > 0.01;

  const priceDisplay = (amount: number) => formatPrice(amount, language);

  // Load profile data for logged-in users
  useEffect(() => {
    const loadProfile = async () => {
      if (!user || profileLoaded) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('name, phone, address, city, email')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setCustomerInfo(prev => ({
          name: data.name || prev.name,
          phone: data.phone || prev.phone,
          division: data.city || prev.division,
          address: data.address || prev.address,
          email: data.email || user.email || prev.email,
        }));
      }
      setProfileLoaded(true);
    };

    loadProfile();
  }, [user, profileLoaded]);

  const [insufficientStockItems, setInsufficientStockItems] = useState<{ name_bn: string; name_en: string }[]>([]);

  // Check stock only once on mount
  useEffect(() => {
    let mounted = true;

    const verifyStock = async () => {
      if (items.length === 0) return;

      setIsCheckingStock(true);
      const result = await checkStock(
        items.map(item => ({ productId: item.productId, quantity: item.quantity }))
      );

      if (mounted) {
        if (!result.valid) {
          setInsufficientStockItems(result.insufficientItems);
          setStockError('insufficient');
        } else {
          setInsufficientStockItems([]);
          setStockError(null);
        }
        setIsCheckingStock(false);
      }
    };

    verifyStock();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;

    setIsApplyingCoupon(true);
    setCouponError(null);

    try {
      const result = await validateCoupon.mutateAsync({
        code: couponCode.trim().toUpperCase(),
        orderTotal: subtotal,
      });

      if (result.coupon) {
        setAppliedCoupon({
          code: result.coupon.code,
          discountType: result.coupon.discount_type as 'percentage' | 'fixed',
          discountValue: result.coupon.discount_value,
          discountAmount: result.discountAmount,
        });
        setCouponCode('');
        toast({
          title: t('কুপন প্রয়োগ হয়েছে', 'Coupon Applied'),
          description: t(`${priceDisplay(result.discountAmount)} ছাড় পাচ্ছেন`, `You're saving ${priceDisplay(result.discountAmount)}`),
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage === 'INVALID_COUPON') {
        setCouponError(t('কুপন বৈধ নয়', 'Invalid coupon code'));
      } else if (errorMessage === 'COUPON_EXPIRED') {
        setCouponError(t('কুপনের মেয়াদ শেষ', 'Coupon has expired'));
      } else if (errorMessage === 'COUPON_LIMIT_REACHED') {
        setCouponError(t('কুপন ব্যবহারের সীমা শেষ', 'Coupon usage limit reached'));
      } else if (errorMessage.startsWith('MIN_ORDER_')) {
        const minAmount = parseInt(errorMessage.split('_')[2]);
        setCouponError(t(`সর্বনিম্ন অর্ডার ${priceDisplay(minAmount)} প্রয়োজন`, `Minimum order of ${priceDisplay(minAmount)} required`));
      } else {
        setCouponError(t('কুপন যাচাই করতে সমস্যা হয়েছে', 'Failed to validate coupon'));
      }
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError(null);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!customerInfo.name.trim()) {
      newErrors.name = t('নাম প্রয়োজন', 'Name is required');
    }
    if (!customerInfo.phone.trim()) {
      newErrors.phone = t('ফোন নম্বর প্রয়োজন', 'Phone is required');
    } else if (!isValidBDPhone(customerInfo.phone)) {
      newErrors.phone = t('সঠিক ফোন নম্বর দিন', 'Enter valid phone number');
    }
    if (!customerInfo.division) {
      newErrors.division = t('জেলা সিলেক্ট করুন', 'Select division');
    }
    if (!customerInfo.address.trim()) {
      newErrors.address = t('ঠিকানা প্রয়োজন', 'Address is required');
    }
    if (!paymentMethod) {
      newErrors.payment = t('পেমেন্ট পদ্ধতি সিলেক্ট করুন', 'Select payment method');
    }

    // bKash validation
    if (paymentMethod === 'bkash') {
      if (!bkashInfo.senderNumber.trim()) {
        newErrors.senderNumber = t('প্রেরকের বিকাশ নম্বর প্রয়োজন', 'Sender bKash number is required');
      } else if (!isValidBDPhone(bkashInfo.senderNumber)) {
        newErrors.senderNumber = t('সঠিক বিকাশ নম্বর দিন', 'Enter valid bKash number');
      }
      if (!bkashInfo.transactionId.trim()) {
        newErrors.transactionId = t('ট্রানজেকশন আইডি প্রয়োজন', 'Transaction ID is required');
      } else if (bkashInfo.transactionId.trim().length < 6) {
        newErrors.transactionId = t('সঠিক ট্রানজেকশন আইডি দিন', 'Enter valid transaction ID');
      }
      if (!bkashInfo.paidAmount.trim()) {
        newErrors.paidAmount = t('পেমেন্ট পরিমাণ প্রয়োজন', 'Paid amount is required');
      } else if (isNaN(parseFloat(bkashInfo.paidAmount)) || parseFloat(bkashInfo.paidAmount) <= 0) {
        newErrors.paidAmount = t('সঠিক পরিমাণ দিন', 'Enter valid amount');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmitOrder = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Get division label for city
      const selectedDivision = BANGLADESH_DIVISIONS.find(d => d.value === customerInfo.division);
      const cityName = selectedDivision
        ? (language === 'bn' ? selectedDivision.labelBn : selectedDivision.labelEn)
        : customerInfo.division;

      // Prepare order items for atomic function
      const orderItems = items.map((item) => ({
        product_id: item.productId,
        product_name_bn: item.name_bn,
        product_name_en: item.name_en,
        quantity: item.quantity,
        price: item.discount_price ?? item.price,
      }));

      // Use atomic function that handles stock check, deduction, and order creation in one transaction
      const { data: orderId, error: orderError } = await supabase.rpc('process_order_with_stock_check', {
        p_customer_name: customerInfo.name.trim(),
        p_customer_phone: normalizeBDPhone(customerInfo.phone),
        p_customer_address: customerInfo.address.trim(),
        p_customer_city: cityName,
        p_customer_email: customerInfo.email.trim() || null,
        p_subtotal: subtotal,
        p_total: total,
        p_payment_method: paymentMethod,
        p_payment_status: 'pending',
        p_order_status: 'pending',
        p_user_id: user?.id || null,
        p_bkash_sender_number: paymentMethod === 'bkash' ? normalizeBDPhone(bkashInfo.senderNumber) : null,
        p_bkash_transaction_id: paymentMethod === 'bkash' ? bkashInfo.transactionId.trim().toUpperCase() : null,
        p_bkash_paid_amount: paymentMethod === 'bkash' ? parseFloat(bkashInfo.paidAmount) : null,
        p_notes: appliedCoupon ? `Coupon: ${appliedCoupon.code} (-${priceDisplay(appliedCoupon.discountAmount)}), Delivery: ${priceDisplay(deliveryCharge)}` : `Delivery: ${priceDisplay(deliveryCharge)}`,
        p_order_items: orderItems,
        p_coupon_code: appliedCoupon?.code || null,
      });

      if (orderError) {
        // Handle specific stock errors
        if (orderError.message?.includes('Insufficient stock')) {
          toast({
            title: t('স্টক শেষ', 'Out of Stock'),
            description: t('কিছু পণ্যে পর্যাপ্ত স্টক নেই। কার্ট আপডেট করুন।', 'Some items are out of stock. Please update your cart.'),
            variant: 'destructive',
          });
          navigate('/cart');
          return;
        }
        throw orderError;
      }

      // Send order notification emails (fire-and-forget, non-blocking)
      try {
        supabase.functions.invoke('send-order-emails', {
          body: { orderId },
        }).catch(err => console.error('Email notification failed (non-blocking):', err));
      } catch (emailErr) {
        console.error('Email trigger setup failed (non-blocking):', emailErr);
      }

      // Clear cart and redirect — pass order data so guest users can see it
      clearCart();
      const selectedDivisionForState = BANGLADESH_DIVISIONS.find(d => d.value === customerInfo.division);
      const cityNameForState = selectedDivisionForState
        ? (language === 'bn' ? selectedDivisionForState.labelBn : selectedDivisionForState.labelEn)
        : customerInfo.division;
      navigate('/order-success', { state: { 
        orderId,
        orderData: {
          id: orderId,
          customer_name: customerInfo.name.trim(),
          customer_phone: normalizeBDPhone(customerInfo.phone),
          customer_address: customerInfo.address.trim(),
          customer_city: cityNameForState,
          total,
          subtotal,
          payment_method: paymentMethod,
          created_at: new Date().toISOString(),
          order_items: orderItems.map((item, idx) => ({ ...item, id: `temp-${idx}` })),
        }
      } });

    } catch (error: any) {
      console.error('Order error:', error);
      toast({
        title: t('ত্রুটি হয়েছে', 'Error occurred'),
        description: t('অর্ডার প্রক্রিয়ায় সমস্যা হয়েছে। আবার চেষ্টা করুন।', 'There was a problem processing your order. Please try again.'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="min-h-screen bg-secondary/30 safe-bottom">
      <SEO title={t('চেকআউট', 'Checkout')} description="ShopLandBD-এ নিরাপদে অর্ডার সম্পন্ন করুন। ক্যাশ অন ডেলিভারি বা বিকাশ পেমেন্ট বেছে নিন।" canonical="/checkout" noindex />
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/cart')} className="mb-4">
            <ChevronLeft className="w-4 h-4 mr-2" />
            {t('কার্টে ফিরুন', 'Back to Cart')}
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold">{t('চেকআউট', 'Checkout')}</h1>
        </div>

        {/* Stock Error Alert */}
        {stockError && insufficientStockItems.length > 0 && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {t(
                `নিম্নলিখিত পণ্যগুলোতে পর্যাপ্ত স্টক নেই: ${insufficientStockItems.map(i => i.name_bn).join(', ')}`,
                `Insufficient stock for: ${insufficientStockItems.map(i => i.name_en).join(', ')}`
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Forms */}
          <div className="lg:col-span-2 space-y-6">
            {/* Shipping Information */}
            <div className="bg-card border rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">
                {t('শিপিং তথ্য', 'Shipping Information')}
              </h2>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">{t('পূর্ণ নাম', 'Full Name')} *</Label>
                  <Input
                    id="name"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                    placeholder={t('আপনার পূর্ণ নাম', 'Your full name')}
                    className={`mt-1 ${errors.name ? 'border-destructive' : ''}`}
                  />
                  {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
                </div>

                <div>
                  <Label htmlFor="phone">{t('ফোন নম্বর', 'Phone Number')} *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                    placeholder="01XXXXXXXXX"
                    className={`mt-1 ${errors.phone ? 'border-destructive' : ''}`}
                  />
                  {errors.phone && <p className="text-sm text-destructive mt-1">{errors.phone}</p>}
                </div>

                <div>
                  <Label htmlFor="email">{t('ইমেইল (ঐচ্ছিক)', 'Email (Optional)')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                    placeholder="email@example.com"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="division">{t('জেলা', 'Division/District')} *</Label>
                  <Select
                    value={customerInfo.division}
                    onValueChange={(value) => setCustomerInfo({ ...customerInfo, division: value })}
                  >
                    <SelectTrigger className={`mt-1 ${errors.division ? 'border-destructive' : ''}`}>
                      <SelectValue placeholder={t('জেলা সিলেক্ট করুন', 'Select division')} />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {BANGLADESH_DIVISIONS.map((div) => (
                        <SelectItem key={div.value} value={div.value}>
                          {language === 'bn' ? div.labelBn : div.labelEn}
                          {div.isDhaka && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({t('ঢাকা এরিয়া', 'Dhaka Area')})
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.division && <p className="text-sm text-destructive mt-1">{errors.division}</p>}
                  {customerInfo.division && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {isFreeDelivery 
                        ? <span className="text-green-600 font-medium">{t('🎉 ফ্রি ডেলিভারি প্রযোজ্য!', '🎉 Free delivery applies!')}</span>
                        : <>{t('ডেলিভারি চার্জ:', 'Delivery charge:')} {priceDisplay(deliveryCharge)}</>
                      }
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="address">{t('সম্পূর্ণ ঠিকানা', 'Full Address')} *</Label>
                  <Input
                    id="address"
                    value={customerInfo.address}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                    placeholder={t('বাড়ি নম্বর, রাস্তা, এলাকা', 'House no, Street, Area')}
                    className={`mt-1 ${errors.address ? 'border-destructive' : ''}`}
                  />
                  {errors.address && <p className="text-sm text-destructive mt-1">{errors.address}</p>}
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-card border rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">
                {t('পেমেন্ট পদ্ধতি', 'Payment Method')}
              </h2>

              <div className="space-y-3">
                <label
                  className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors ${paymentMethod === 'cod'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                    }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'cod'}
                    onChange={() => setPaymentMethod('cod')}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'cod' ? 'border-primary' : 'border-muted-foreground'
                    }`}>
                    {paymentMethod === 'cod' && (
                      <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                    )}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{t('ক্যাশ অন ডেলিভারি', 'Cash on Delivery')}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('পণ্য হাতে পেয়ে টাকা দিন', 'Pay when you receive')}
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors ${paymentMethod === 'bkash'
                      ? 'border-bkash bg-bkash/5'
                      : 'border-border hover:border-bkash/50'
                    }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'bkash'}
                    onChange={() => setPaymentMethod('bkash')}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'bkash' ? 'border-bkash' : 'border-muted-foreground'
                    }`}>
                    {paymentMethod === 'bkash' && (
                      <div className="w-2.5 h-2.5 rounded-full bg-bkash" />
                    )}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-bkash/10 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-bkash" />
                  </div>
                  <div>
                    <p className="font-medium text-bkash">{t('বিকাশ পেমেন্ট', 'bKash Payment')}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('বিকাশে টাকা পাঠান', 'Send money via bKash')}
                    </p>
                  </div>
                </label>
              </div>
              {errors.payment && <p className="text-sm text-destructive mt-2">{errors.payment}</p>}

              {/* bKash Payment Form */}
              {paymentMethod === 'bkash' && (
                <div className="mt-6 p-4 bg-bkash/5 rounded-lg border border-bkash/20 space-y-4">
                  <div className="text-center">
                    {bkashQrCode && (
                      <img
                        src={bkashQrCode}
                        alt="bKash QR"
                        className="w-32 h-32 mx-auto rounded-lg border-2 border-bkash/20 object-contain bg-white p-2 mb-3"
                      />
                    )}
                    <p className="text-sm text-muted-foreground mb-2">
                      {t('QR কোড স্ক্যান করে পেমেন্ট করুন', 'Scan the QR code to make a payment')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2 mb-1">
                      {t('মার্চেন্ট বিকাশ নম্বর', 'Merchant bKash Number')}
                    </p>
                    <p className="text-2xl font-bold text-bkash">{bkashNumber}</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {t(`মোট: ${priceDisplay(total)}`, `Total: ${priceDisplay(total)}`)}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label>{t('প্রেরকের বিকাশ নম্বর', 'Sender bKash Number')} *</Label>
                      <Input
                        value={bkashInfo.senderNumber}
                        onChange={(e) => setBkashInfo({ ...bkashInfo, senderNumber: e.target.value })}
                        placeholder="01XXXXXXXXX"
                        className={`mt-1 ${errors.senderNumber ? 'border-destructive' : ''}`}
                      />
                      {errors.senderNumber && <p className="text-sm text-destructive mt-1">{errors.senderNumber}</p>}
                    </div>

                    <div>
                      <Label>{t('ট্রানজেকশন আইডি', 'Transaction ID')} *</Label>
                      <Input
                        value={bkashInfo.transactionId}
                        onChange={(e) => setBkashInfo({ ...bkashInfo, transactionId: e.target.value })}
                        placeholder="8N7A5KJ3LP"
                        className={`mt-1 ${errors.transactionId ? 'border-destructive' : ''}`}
                      />
                      {errors.transactionId && <p className="text-sm text-destructive mt-1">{errors.transactionId}</p>}
                    </div>

                    <div>
                      <Label>{t('পেমেন্ট পরিমাণ (টাকা)', 'Paid Amount (BDT)')} *</Label>
                      <Input
                        type="number"
                        value={bkashInfo.paidAmount}
                        onChange={(e) => setBkashInfo({ ...bkashInfo, paidAmount: e.target.value })}
                        placeholder={total.toString()}
                        className={`mt-1 ${errors.paidAmount || paymentMismatch ? 'border-destructive' : ''}`}
                      />
                      {errors.paidAmount && <p className="text-sm text-destructive mt-1">{errors.paidAmount}</p>}
                      {paymentMismatch && !errors.paidAmount && (
                        <Alert variant="destructive" className="mt-2">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            {t(
                              `পরিমাণ (${priceDisplay(parseFloat(bkashInfo.paidAmount))}) মোট (${priceDisplay(total)}) এর সাথে মিলছে না`,
                              `Amount (${priceDisplay(parseFloat(bkashInfo.paidAmount))}) doesn't match total (${priceDisplay(total)})`
                            )}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-card border rounded-xl p-6 sticky top-20">
              <h2 className="text-lg font-semibold mb-4">
                {t('অর্ডার সামারি', 'Order Summary')}
              </h2>

              {/* Cart Items */}
              <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <img
                      src={item.image || '/placeholder.svg'}
                      alt={language === 'bn' ? item.name_bn : item.name_en}
                      className="w-14 h-14 rounded-lg object-cover bg-secondary"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-1">
                        {language === 'bn' ? item.name_bn : item.name_en}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('পরিমাণ:', 'Qty:')} {item.quantity}
                      </p>
                    </div>
                    <p className="font-medium text-sm">
                      {priceDisplay((item.discount_price ?? item.price) * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Coupon Section */}
              <div className="border-t pt-4 mb-4">
                <Label className="text-sm flex items-center gap-1 mb-2">
                  <Tag className="w-4 h-4" />
                  {t('কুপন কোড আছে?', 'Have a coupon?')}
                </Label>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900">
                    <div>
                      <p className="font-medium text-green-700 dark:text-green-400">{appliedCoupon.code}</p>
                      <p className="text-xs text-green-600 dark:text-green-500">
                        -{priceDisplay(appliedCoupon.discountAmount)}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleRemoveCoupon}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder={t('কুপন কোড দিন', 'Enter code')}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={handleApplyCoupon}
                      disabled={!couponCode.trim() || isApplyingCoupon}
                    >
                      {isApplyingCoupon ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        t('প্রয়োগ', 'Apply')
                      )}
                    </Button>
                  </div>
                )}
                {couponError && (
                  <p className="text-sm text-destructive mt-1">{couponError}</p>
                )}
              </div>

              {/* Pricing */}
              <div className="space-y-2 border-t pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('সাবটোটাল', 'Subtotal')}</span>
                  <span>{priceDisplay(subtotal)}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>{t('কুপন ছাড়', 'Coupon Discount')}</span>
                    <span>-{priceDisplay(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('ডেলিভারি', 'Shipping')}</span>
                  <span>
                    {!customerInfo.division
                      ? t('জেলা সিলেক্ট করুন', 'Select division')
                      : isFreeDelivery
                        ? <span className="text-green-600 font-medium">{t('ফ্রি ডেলিভারি! 🎉', 'Free Delivery! 🎉')}</span>
                        : priceDisplay(deliveryCharge)}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>{t('মোট', 'Total')}</span>
                  <span className="text-primary">{priceDisplay(total)}</span>
                </div>
              </div>

              {/* Place Order Button */}
              <Button
                onClick={handleSubmitOrder}
                disabled={isSubmitting || isCheckingStock || !!stockError || !paymentMethod || !customerInfo.division}
                className="w-full mt-6 h-12 text-base"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('প্রক্রিয়াকরণ...', 'Processing...')}
                  </>
                ) : (
                  t('অর্ডার করুন', 'Place Order')
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
