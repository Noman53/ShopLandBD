import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function ResetPasswordPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active && session) {
        setHasSession(true);
        setCheckingSession(false);
      }
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        console.error('Unable to verify password recovery session:', error);
      }
      setHasSession(Boolean(data.session));
      setCheckingSession(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password.length < 6) {
      toast.error(t('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে', 'Password must be at least 6 characters'));
      return;
    }
    if (password !== confirmPassword) {
      toast.error(t('পাসওয়ার্ড মেলেনি', 'Passwords do not match'));
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(t('পাসওয়ার্ড পরিবর্তন করা যায়নি', 'Unable to update password'), {
          description: error.message,
        });
        return;
      }
      setCompleted(true);
    } catch (error) {
      toast.error(t('পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে', 'Password update failed'), {
        description: error instanceof Error
          ? error.message
          : t('একটি অপ্রত্যাশিত ত্রুটি ঘটেছে', 'An unexpected error occurred'),
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <p role="status" className="text-sm text-muted-foreground">
          {t('রিকভারি লিংক যাচাই হচ্ছে...', 'Verifying recovery link...')}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background safe-bottom flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-sm">
        <Link
          to="/forgot-password"
          className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4 text-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          {t('নতুন লিংক চান?', 'Need a new link?')}
        </Link>

        <div className="bg-card rounded-2xl shadow-lg border p-5 sm:p-6">
          <div className="text-center mb-5">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-primary/10 flex items-center justify-center">
              <KeyRound className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold">
              {completed
                ? t('পাসওয়ার্ড পরিবর্তন হয়েছে', 'Password updated')
                : t('নতুন পাসওয়ার্ড দিন', 'Choose a new password')}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              {completed
                ? t('পাসওয়ার্ড পরিবর্তন হয়েছে। আপনার অ্যাকাউন্টে চালিয়ে যান।', 'Your password has changed. Continue to your account.')
                : t('কমপক্ষে ৬ অক্ষরের একটি পাসওয়ার্ড ব্যবহার করুন।', 'Use a password with at least 6 characters.')}
            </p>
          </div>

          {completed ? (
            <Button className="w-full" onClick={() => navigate('/account', { replace: true })}>
              {t('অ্যাকাউন্টে যান', 'Continue to account')}
            </Button>
          ) : hasSession ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-password">{t('নতুন পাসওয়ার্ড', 'New password')}</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">{t('পাসওয়ার্ড নিশ্চিত করুন', 'Confirm password')}</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </div>
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? t('আপডেট হচ্ছে...', 'Updating...') : t('পাসওয়ার্ড আপডেট করুন', 'Update password')}
              </Button>
            </form>
          ) : (
            <div className="space-y-3">
              <p role="alert" className="text-sm text-center text-destructive">
                {t('রিকভারি লিংকটি অবৈধ বা মেয়াদোত্তীর্ণ।', 'This recovery link is invalid or has expired.')}
              </p>
              <Button asChild className="w-full">
                <Link to="/forgot-password">{t('নতুন লিংক পাঠান', 'Request a new link')}</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
