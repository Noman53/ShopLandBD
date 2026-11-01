import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import SEO from '@/components/SEO';

export default function TermsPage() {
  const { t, language } = useLanguage();

  return (
    <div className="min-h-screen bg-background safe-bottom">
      <SEO
        title={t('শর্তাবলী', 'Terms & Conditions')}
        description="ShopLandBD শর্তাবলী — অর্ডার, পেমেন্ট ও ডেলিভারি সংক্রান্ত নিয়মাবলী।"
        canonical="/terms"
      />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">
          {t('শর্তাবলী', 'Terms & Conditions')}
        </h1>

        <div className="prose prose-lg dark:prose-invert max-w-none space-y-6">
          {language === 'bn' ? (
            <>
              <section>
                <h2 className="text-xl font-semibold mb-4">১. সাধারণ শর্তাবলী</h2>
                <p className="text-muted-foreground">
                  এই ওয়েবসাইট ব্যবহার করে আপনি নিম্নলিখিত শর্তাবলী মেনে নিতে সম্মত হচ্ছেন। অনুগ্রহ করে এগুলো মনোযোগ সহকারে পড়ুন।
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-4">২. অর্ডার ও পেমেন্ট</h2>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>সমস্ত দাম বাংলাদেশি টাকায় প্রদর্শিত</li>
                  <li>অর্ডার কনফার্মেশনের পর দাম পরিবর্তন হবে না</li>
                  <li>বিকাশ পেমেন্ট ভেরিফিকেশন সাপেক্ষ</li>
                  <li>ক্যাশ অন ডেলিভারিতে পূর্ণ মূল্য প্রদান করতে হবে</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-4">৩. ডেলিভারি</h2>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>ঢাকার ভিতরে: ২-৩ কার্যদিবস</li>
                  <li>ঢাকার বাইরে: ৩-৫ কার্যদিবস</li>
                  <li>ডেলিভারি চার্জ অর্ডার অনুযায়ী নির্ধারিত হবে</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-4">৪. রিটার্ন ও রিফান্ড</h2>
                <p className="text-muted-foreground">
                  বিস্তারিত জানতে আমাদের রিটার্ন ও রিফান্ড পলিসি পৃষ্ঠা দেখুন।
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-4">৫. দায়বদ্ধতা সীমাবদ্ধতা</h2>
                <p className="text-muted-foreground">
                  প্রাকৃতিক দুর্যোগ, হরতাল বা অন্যান্য অপ্রত্যাশিত পরিস্থিতিতে ডেলিভারি বিলম্বের জন্য আমরা দায়ী থাকব না।
                </p>
              </section>
            </>
          ) : (
            <>
              <section>
                <h2 className="text-xl font-semibold mb-4">1. General Terms</h2>
                <p className="text-muted-foreground">
                  By using this website, you agree to comply with the following terms and conditions. Please read them carefully.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-4">2. Orders & Payments</h2>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>All prices are displayed in Bangladeshi Taka</li>
                  <li>Prices will not change after order confirmation</li>
                  <li>bKash payments are subject to verification</li>
                  <li>Full payment is required for Cash on Delivery</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-4">3. Delivery</h2>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>Inside Dhaka: 2-3 business days</li>
                  <li>Outside Dhaka: 3-5 business days</li>
                  <li>Delivery charges are determined by order</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-4">4. Returns & Refunds</h2>
                <p className="text-muted-foreground">
                  Please see our Return & Refund Policy page for details.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-4">5. Limitation of Liability</h2>
                <p className="text-muted-foreground">
                  We are not responsible for delivery delays due to natural disasters, strikes, or other unforeseen circumstances.
                </p>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
