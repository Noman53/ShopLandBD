import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, KeyRound, Mail } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      const { error } = await resetPassword(email.trim());
      if (error) {
        toast.error(t('ইমেইল পাঠানো যায়নি', 'Unable to send recovery email'), {
          description: error.message,
        });
        return;
      }

      setEmailSent(true);
    } catch (error) {
      toast.error(t('রিকভারি অনুরোধ ব্যর্থ হয়েছে', 'Recovery request failed'), {
        description: error instanceof Error
          ? error.message
          : t('একটি অপ্রত্যাশিত ত্রুটি ঘটেছে', 'An unexpected error occurred'),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background safe-bottom flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-sm">
        <Link
          to="/login"
          className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4 text-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          {t('লগইনে ফিরে যান', 'Back to login')}
        </Link>

        <div className="bg-card rounded-2xl shadow-lg border p-5 sm:p-6">
          <div className="text-center mb-5">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-primary/10 flex items-center justify-center">
              {emailSent
                ? <CheckCircle className="w-6 h-6 text-primary" />
                : <KeyRound className="w-6 h-6 text-primary" />}
            </div>
            <h1 className="text-xl font-bold">
              {emailSent
                ? t('আপনার ইমেইল দেখুন', 'Check your email')
                : t('পাসওয়ার্ড ভুলে গেছেন?', 'Forgot your password?')}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              {emailSent
                ? t(
                    'অ্যাকাউন্ট থাকলে পাসওয়ার্ড পরিবর্তনের একটি নিরাপদ লিংক পাঠানো হয়েছে।',
                    'If an account exists for this address, a secure password reset link has been sent.',
                  )
                : t(
                    'আপনার অ্যাকাউন্টের ইমেইল দিন। পাসওয়ার্ড পরিবর্তনের লিংক পাঠানো হবে।',
                    'Enter your account email and we will send a secure password reset link.',
                  )}
            </p>
          </div>

          {emailSent ? (
            <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground break-all">{email}</p>
              <Button variant="outline" className="w-full" onClick={() => setEmailSent(false)}>
                {t('অন্য ইমেইল ব্যবহার করুন', 'Use a different email')}
              </Button>
              <Button asChild className="w-full">
                <Link to="/login">{t('সাইন ইন করুন', 'Sign in')}</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="recovery-email">{t('ইমেইল', 'Email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="recovery-email"
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    required
                    placeholder={t('আপনার ইমেইল', 'you@example.com')}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="pl-10 h-11"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading
                  ? t('পাঠানো হচ্ছে...', 'Sending...')
                  : t('রিকভারি লিংক পাঠান', 'Send recovery link')}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
