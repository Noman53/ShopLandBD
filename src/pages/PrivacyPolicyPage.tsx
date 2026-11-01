import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import SEO from '@/components/SEO';

export default function PrivacyPolicyPage() {
  const { t, language } = useLanguage();

  return (
    <div className="min-h-screen bg-background safe-bottom">
      <SEO
        title={t('প্রাইভেসি পলিসি', 'Privacy Policy')}
        description="ShopLandBD প্রাইভেসি পলিসি — আপনার তথ্য কীভাবে সংগ্রহ ও সুরক্ষিত রাখা হয়।"
        canonical="/privacy-policy"
      />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">
          {t('প্রাইভেসি পলিসি', 'Privacy Policy')}
        </h1>

        <div className="prose prose-lg dark:prose-invert max-w-none space-y-6">
          {language === 'bn' ? (
            <>
              <section>
                <h2 className="text-xl font-semibold mb-4">১. তথ্য সংগ্রহ</h2>
                <p className="text-muted-foreground">
                  আমরা আপনার কাছ থেকে যে তথ্য সংগ্রহ করি তা আমাদের সেবা প্রদানের জন্য অপরিহার্য। এতে অন্তর্ভুক্ত:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground mt-2 space-y-1">
                  <li>নাম, ফোন নম্বর এবং ইমেইল ঠিকানা</li>
                  <li>ডেলিভারি ঠিকানা</li>
                  <li>অর্ডার ইতিহাস এবং পেমেন্ট তথ্য</li>
                  <li>ডিভাইস ও ব্রাউজার তথ্য</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-4">২. তথ্য ব্যবহার</h2>
                <p className="text-muted-foreground">
                  আপনার তথ্য নিম্নলিখিত উদ্দেশ্যে ব্যবহার করা হয়:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground mt-2 space-y-1">
                  <li>অর্ডার প্রসেসিং ও ডেলিভারি</li>
                  <li>গ্রাহক সেবা প্রদান</li>
                  <li>পণ্য ও অফার সম্পর্কে আপডেট</li>
                  <li>সেবার মান উন্নয়ন</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-4">৩. তথ্য সুরক্ষা</h2>
                <p className="text-muted-foreground">
                  আপনার তথ্যের অ্যাক্সেস নিয়ন্ত্রণে আমরা আমাদের সিস্টেমে অনুমতি-ভিত্তিক নিয়ন্ত্রণ ও অন্যান্য সুরক্ষা ব্যবস্থা ব্যবহার করি। তবে ইন্টারনেটের মাধ্যমে তথ্য পাঠানো বা সংরক্ষণের কোনো পদ্ধতিই সম্পূর্ণ নিরাপত্তার নিশ্চয়তা দিতে পারে না।
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-4">৪. তৃতীয় পক্ষ</h2>
                <p className="text-muted-foreground">
                  আমরা আপনার তথ্য বিক্রি বা ভাড়া দিই না। অর্ডার সম্পন্ন করতে ডেলিভারি পার্টনারদের সাথে প্রয়োজনীয় তথ্য শেয়ার করা হয়। চ্যাটের বার্তা আমাদের সহায়তা সেবা দেওয়া ও কথোপকথন সংরক্ষণের জন্য Supabase-এ প্রক্রিয়াকৃত হয়। চ্যাটে পেমেন্ট তথ্য বা অপ্রয়োজনীয় সংবেদনশীল তথ্য পাঠাবেন না।
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-4">৫. যোগাযোগ</h2>
                <p className="text-muted-foreground">
                  প্রাইভেসি সংক্রান্ত যেকোনো প্রশ্নের জন্য আমাদের সাথে যোগাযোগ করুন: shoplanbd2@gmail.com
                </p>
              </section>
            </>
          ) : (
            <>
              <section>
                <h2 className="text-xl font-semibold mb-4">1. Information Collection</h2>
                <p className="text-muted-foreground">
                  The information we collect from you is essential for providing our services. This includes:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground mt-2 space-y-1">
                  <li>Name, phone number, and email address</li>
                  <li>Delivery address</li>
                  <li>Order history and payment information</li>
                  <li>Device and browser information</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-4">2. Use of Information</h2>
                <p className="text-muted-foreground">
                  Your information is used for the following purposes:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground mt-2 space-y-1">
                  <li>Order processing and delivery</li>
                  <li>Customer service</li>
                  <li>Updates about products and offers</li>
                  <li>Service quality improvement</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-4">3. Data Protection</h2>
                <p className="text-muted-foreground">
                  We use permission-based access controls and other safeguards in the systems that handle your information. However, no method of transmitting or storing information online can be guaranteed completely secure.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-4">4. Third Parties</h2>
                <p className="text-muted-foreground">
                  We do not sell or rent your information. Necessary details are shared with delivery partners to fulfil orders. Chat messages are processed and stored in Supabase to provide customer support and maintain conversation history. Please do not send payment details or unnecessary sensitive information through chat.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-4">5. Contact</h2>
                <p className="text-muted-foreground">
                  For any privacy-related questions, contact us at: shoplanbd2@gmail.com
                </p>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
