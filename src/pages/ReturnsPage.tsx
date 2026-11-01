import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Package, RefreshCcw, Clock, AlertCircle } from 'lucide-react';
import SEO from '@/components/SEO';

export default function ReturnsPage() {
  const { t, language } = useLanguage();

  return (
    <div className="min-h-screen bg-background safe-bottom">
      <SEO
        title={t('রিটার্ন ও রিফান্ড পলিসি', 'Return & Refund Policy')}
        description="ShopLandBD রিটার্ন ও রিফান্ড পলিসি — ৭ দিনের রিটার্ন উইন্ডো, সহজ প্রক্রিয়া।"
        canonical="/returns"
      />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">
          {t('রিটার্ন ও রিফান্ড পলিসি', 'Return & Refund Policy')}
        </h1>

        {/* Quick Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-card border rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">{t('৭ দিন', '7 Days')}</p>
              <p className="text-xs text-muted-foreground">{t('রিটার্ন উইন্ডো', 'Return Window')}</p>
            </div>
          </div>
          <div className="bg-card border rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <RefreshCcw className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">{t('সহজ প্রক্রিয়া', 'Easy Process')}</p>
              <p className="text-xs text-muted-foreground">{t('যোগ্যতা ও শর্ত দেখুন', 'Check eligibility and terms')}</p>
            </div>
          </div>
          <div className="bg-card border rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">{t('আসল প্যাকেজিং', 'Original packaging')}</p>
              <p className="text-xs text-muted-foreground">{t('রিটার্নের শর্ত দেখুন', 'See return terms')}</p>
            </div>
          </div>
        </div>

        <div className="prose prose-lg dark:prose-invert max-w-none space-y-6">
          {language === 'bn' ? (
            <>
              <section>
                <h2 className="text-xl font-semibold mb-4">রিটার্ন নীতি</h2>
                <p className="text-muted-foreground">
                  আমরা গ্রাহক সন্তুষ্টিকে সর্বোচ্চ প্রাধান্য দিই। পণ্য ডেলিভারির ৭ দিনের মধ্যে রিটার্ন করতে পারবেন।
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-4">রিটার্নের যোগ্যতা</h2>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>পণ্যে ম্যানুফ্যাকচারিং ত্রুটি থাকলে</li>
                  <li>ভুল পণ্য ডেলিভারি হলে</li>
                  <li>পণ্য ক্ষতিগ্রস্ত অবস্থায় পৌঁছালে</li>
                  <li>বিবরণ অনুযায়ী পণ্য না হলে</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-4">রিটার্নের শর্ত</h2>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>পণ্য অবশ্যই অব্যবহৃত ও আসল প্যাকেজিংসহ হতে হবে</li>
                  <li>সমস্ত ট্যাগ ও লেবেল অক্ষত থাকতে হবে</li>
                  <li>ক্রয়ের রসিদ বা অর্ডার নম্বর প্রয়োজন</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-4">রিফান্ড প্রক্রিয়া</h2>
                <p className="text-muted-foreground">
                  রিটার্ন অনুমোদনের ৫-৭ কার্যদিবসের মধ্যে রিফান্ড প্রসেস করা হবে। বিকাশে পেমেন্ট করা থাকলে বিকাশে এবং COD হলে বিকাশ বা ব্যাংক ট্রান্সফারে রিফান্ড করা হবে।
                </p>
              </section>

              <section className="bg-destructive/10 rounded-xl p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-destructive">যে পণ্য রিটার্ন করা যাবে না</h3>
                    <ul className="list-disc pl-4 text-sm text-muted-foreground mt-2 space-y-1">
                      <li>ইনার ওয়্যার ও আন্ডারগার্মেন্টস</li>
                      <li>কাস্টমাইজড পণ্য</li>
                      <li>পার্সোনাল কেয়ার আইটেম (ব্যবহৃত)</li>
                      <li>ফুড ও গ্রোসারি আইটেম</li>
                    </ul>
                  </div>
                </div>
              </section>
            </>
          ) : (
            <>
              <section>
                <h2 className="text-xl font-semibold mb-4">Return Policy</h2>
                <p className="text-muted-foreground">
                  We prioritize customer satisfaction. You can return products within 7 days of delivery.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-4">Eligibility for Return</h2>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>Manufacturing defect in the product</li>
                  <li>Wrong product delivered</li>
                  <li>Product arrived damaged</li>
                  <li>Product doesn't match description</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-4">Return Conditions</h2>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>Product must be unused with original packaging</li>
                  <li>All tags and labels must be intact</li>
                  <li>Purchase receipt or order number required</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-4">Refund Process</h2>
                <p className="text-muted-foreground">
                  Refunds will be processed within 5-7 business days after return approval. bKash payments will be refunded to bKash, COD payments will be refunded via bKash or bank transfer.
                </p>
              </section>

              <section className="bg-destructive/10 rounded-xl p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-destructive">Non-Returnable Items</h3>
                    <ul className="list-disc pl-4 text-sm text-muted-foreground mt-2 space-y-1">
                      <li>Innerwear and undergarments</li>
                      <li>Customized products</li>
                      <li>Personal care items (used)</li>
                      <li>Food and grocery items</li>
                    </ul>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
