import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Phone, Mail, MapPin, Clock, Send, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import SEO, { SITE_URL } from '@/components/SEO';

export default function ContactPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-contact-email', {
        body: formData,
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: t('বার্তা পাঠানো হয়েছে ✅', 'Message Sent ✅'),
          description: t('আমরা শীঘ্রই আপনার সাথে যোগাযোগ করব।', 'We will contact you soon.'),
        });
        setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
      } else {
        toast({
          title: t('বার্তা পাঠানো যায়নি', 'Could not send message'),
          description: t(
            'দয়া করে পরে আবার চেষ্টা করুন অথবা সরাসরি ফোনে যোগাযোগ করুন।',
            'Please try again later or contact us directly by phone.'
          ),
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: t('ত্রুটি হয়েছে', 'Error occurred'),
        description: t(
          'দয়া করে পরে আবার চেষ্টা করুন।',
          'Please try again later.'
        ),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background safe-bottom">
      <SEO
        title={t('যোগাযোগ করুন', 'Contact Us')}
        description="ShopLandBD-এর সাথে যোগাযোগ করুন। ফোন, ইমেইল বা মেসেজের মাধ্যমে আমাদের জানান।"
        canonical="/contact"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'LocalBusiness',
          name: 'ShopLandBD',
          image: `${SITE_URL}/images/shopland-logo.png`,
          telephone: '+880-1521-486023',
          email: 'shoplanbd2@gmail.com',
          url: `${SITE_URL}/contact`,
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Dhaka',
            addressCountry: 'BD',
          },
          openingHoursSpecification: [
            {
              '@type': 'OpeningHoursSpecification',
              dayOfWeek: ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
              opens: '10:00',
              closes: '18:00',
            },
          ],
        }}
      />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-4">
            {t('যোগাযোগ করুন', 'Contact Us')}
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {t(
              'ShopLandBD-তে আপনাকে স্বাগতম। আমাদের সাথে যোগাযোগ করুন, আমরা আপনাকে সাহায্য করতে প্রস্তুত।',
              'Welcome to ShopLandBD. Get in touch with us — we are ready to help you.'
            )}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Contact Info Cards */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-card border rounded-xl p-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Phone className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">{t('ফোন', 'Phone')}</h3>
              <a href="tel:+8801521486023" className="text-muted-foreground hover:text-primary transition-colors">
                +880 1521-486023
              </a>
              <p className="text-sm text-muted-foreground mt-1">
                {t('সকাল ৯টা - রাত ১০টা', '9 AM - 10 PM')}
              </p>
            </div>

            <div className="bg-card border rounded-xl p-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">{t('ইমেইল', 'Email')}</h3>
              <a href="mailto:shoplanbd2@gmail.com" className="text-muted-foreground hover:text-primary transition-colors">
                shoplanbd2@gmail.com
              </a>
              <p className="text-sm text-muted-foreground mt-1">
                {t('২৪ ঘন্টার মধ্যে জবাব', 'Response within 24 hours')}
              </p>
            </div>

            <div className="bg-card border rounded-xl p-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">{t('অফিস', 'Office')}</h3>
              <p className="text-muted-foreground">
                {t('ঢাকা, বাংলাদেশ', 'Dhaka, Bangladesh')}
              </p>
            </div>

            <div className="bg-card border rounded-xl p-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">{t('অফিস সময়', 'Office Hours')}</h3>
              <p className="text-muted-foreground text-sm">
                {t('শনি - বৃহস্পতি: সকাল ১০টা - সন্ধ্যা ৬টা', 'Sat - Thu: 10 AM - 6 PM')}
              </p>
              <p className="text-muted-foreground text-sm">
                {t('শুক্রবার: বন্ধ', 'Friday: Closed')}
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-card border rounded-xl p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <MessageSquare className="w-6 h-6 text-primary" />
                <h2 className="text-xl font-semibold">
                  {t('মেসেজ পাঠান', 'Send a Message')}
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">{t('নাম', 'Name')} *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={t('আপনার নাম', 'Your name')}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">{t('ফোন', 'Phone')} *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="01XXXXXXXXX"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">{t('ইমেইল', 'Email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>

                <div>
                  <Label htmlFor="subject">{t('বিষয়', 'Subject')} *</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder={t('আপনার বিষয় লিখুন', 'Enter your subject')}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="message">{t('বার্তা', 'Message')} *</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder={t('আপনার বার্তা লিখুন...', 'Write your message...')}
                    rows={5}
                    required
                  />
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    t('পাঠানো হচ্ছে...', 'Sending...')
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      {t('বার্তা পাঠান', 'Send Message')}
                    </>
                  )}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
