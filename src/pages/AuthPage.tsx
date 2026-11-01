import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, User, Phone, Package, CheckCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { isValidEmail, isValidBDPhone, validatePassword } from '@/lib/validation';

export default function AuthPage() {
  const { t } = useLanguage();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [activeTab, setActiveTab] = useState(location.pathname === '/register' ? 'signup' : 'signin');
  
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  // Redirect if already logged in (but not during active login flow)
  useEffect(() => {
    if (!loading && user && !isLoggingIn) {
      navigate('/', { replace: true });
    }
  }, [user, loading, navigate, isLoggingIn]);
  
  // Sync tab with URL
  useEffect(() => {
    setActiveTab(location.pathname === '/register' ? 'signup' : 'signin');
  }, [location.pathname]);
  
  // Sign In state - supports email OR phone
  const [signInIdentifier, setSignInIdentifier] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [signInLoading, setSignInLoading] = useState(false);
  const [signInErrors, setSignInErrors] = useState<{ identifier?: string; password?: string }>({});
  
  // Sign Up state
  const [signUpName, setSignUpName] = useState('');
  const [signUpPhone, setSignUpPhone] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [signUpLoading, setSignUpLoading] = useState(false);
  const [signUpErrors, setSignUpErrors] = useState<{ 
    name?: string; 
    phone?: string; 
    email?: string; 
    password?: string; 
    confirmPassword?: string 
  }>({});

  // Custom success toast component
  const showSuccessToast = (title: string, description?: string) => {
    toast.custom((id) => (
      <div className="animate-in slide-in-from-top-2 fade-in duration-300 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl p-4 shadow-lg flex items-start gap-3 max-w-sm">
        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-green-800 dark:text-green-200">{title}</p>
          {description && (
            <p className="text-sm text-green-700 dark:text-green-300 mt-0.5">{description}</p>
          )}
        </div>
      </div>
    ), { duration: 4000 });
  };

  // Detect if input is email or phone
  const isEmailInput = (input: string): boolean => {
    return input.includes('@') || !isValidBDPhone(input);
  };

  const validateSignInForm = (): boolean => {
    const errors: typeof signInErrors = {};
    
    const identifier = signInIdentifier.trim();
    if (!identifier) {
      errors.identifier = t('ইমেইল অথবা ফোন নম্বর দিন', 'Please enter email or phone number');
    } else {
      // Check if it's an email or phone
      if (identifier.includes('@')) {
        if (!isValidEmail(identifier)) {
          errors.identifier = t('সঠিক ইমেইল দিন', 'Please enter a valid email');
        }
      } else {
        if (!isValidBDPhone(identifier)) {
          errors.identifier = t('সঠিক ফোন নম্বর দিন (01XXXXXXXXX)', 'Please enter a valid phone number (01XXXXXXXXX)');
        }
      }
    }
    
    if (!signInPassword) {
      errors.password = t('পাসওয়ার্ড দিন', 'Please enter password');
    }
    
    setSignInErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateSignUpForm = (): boolean => {
    const errors: typeof signUpErrors = {};
    
    if (!signUpName.trim()) {
      errors.name = t('নাম দিন', 'Please enter your name');
    }
    
    if (!signUpPhone.trim()) {
      errors.phone = t('ফোন নম্বর দিন', 'Please enter phone number');
    } else if (!isValidBDPhone(signUpPhone)) {
      errors.phone = t('সঠিক ফোন নম্বর দিন (01XXXXXXXXX)', 'Please enter a valid phone number (01XXXXXXXXX)');
    }
    
    if (signUpEmail.trim() && !isValidEmail(signUpEmail)) {
      errors.email = t('সঠিক ইমেইল দিন', 'Please enter a valid email');
    }
    
    const passwordValidation = validatePassword(signUpPassword);
    if (!passwordValidation.isValid) {
      errors.password = t('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে', 'Password must be at least 6 characters');
    }
    
    if (signUpPassword !== signUpConfirmPassword) {
      errors.confirmPassword = t('পাসওয়ার্ড মিলছে না', 'Passwords do not match');
    }
    
    setSignUpErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInErrors({});
    
    if (!validateSignInForm()) {
      return;
    }

    setSignInLoading(true);
    setIsLoggingIn(true);
    try {
      const identifier = signInIdentifier.trim();
      let loginSuccess = false;
      
      if (identifier.includes('@')) {
        const { error } = await supabase.auth.signInWithPassword({
          email: identifier,
          password: signInPassword,
        });
        if (!error) {
          loginSuccess = true;
        }
      } else {
        const { data, error } = await supabase.functions.invoke('resolve-login', {
          body: { identifier, password: signInPassword },
        });
        if (!error && data?.session) {
          const { error: sessionError } = await supabase.auth.setSession(data.session);
          loginSuccess = !sessionError;
        }
      }

      if (loginSuccess) {
        showSuccessToast(
          t('সফলভাবে লগইন হয়েছে!', 'Login Successful!'),
          t('শপিং উপভোগ করুন', 'Enjoy your shopping')
        );
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 500);
      } else {
        toast.error(t('লগইন ব্যর্থ হয়েছে', 'Login failed'), {
          description: t('ইমেইল/ফোন অথবা পাসওয়ার্ড ভুল', 'Invalid email/phone or password'),
        });
      }
    } catch (err) {
      toast.error(t('লগইন ব্যর্থ হয়েছে', 'Login failed'), {
        description: err instanceof Error
          ? err.message
          : t('একটি অপ্রত্যাশিত ত্রুটি ঘটেছে', 'An unexpected error occurred'),
      });
    } finally {
      setSignInLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpErrors({});
    
    if (!validateSignUpForm()) {
      return;
    }

    // Use phone as email if email not provided
    const emailToUse = signUpEmail.trim() || `${signUpPhone}@phone.local`;

    setSignUpLoading(true);
    setIsLoggingIn(true);
    try {
      const { error, data } = await supabase.auth.signUp({
        email: emailToUse,
        password: signUpPassword,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: signUpName.trim(),
            phone: signUpPhone.trim(),
          }
        },
      });
      
      if (error) {
        toast.error(t('রেজিস্ট্রেশন ব্যর্থ হয়েছে', 'Registration failed'), {
          description: error.message,
        });
        return;
      }

      // Create/update profile with name and phone
      if (data.user) {
        await supabase.from('profiles').upsert({
          user_id: data.user.id,
          name: signUpName.trim(),
          phone: signUpPhone.trim(),
          email: signUpEmail.trim() || null,
        });
      }
      
      showSuccessToast(
        t('অ্যাকাউন্ট তৈরি সফল!', 'Account Created Successfully!'),
        t('শপিং উপভোগ করুন', 'Enjoy your shopping')
      );
      
      // Small delay to let the toast show before navigation
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 500);
    } catch (err) {
      toast.error(t('রেজিস্ট্রেশন ব্যর্থ হয়েছে', 'Registration failed'), {
        description: err instanceof Error
          ? err.message
          : t('একটি অপ্রত্যাশিত ত্রুটি ঘটেছে', 'An unexpected error occurred'),
      });
    } finally {
      setSignUpLoading(false);
    }
  };

  // Show loading while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background safe-bottom flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('হোম', 'Home')}
        </Link>

        {/* Card Container */}
        <div className="bg-card rounded-2xl shadow-lg border p-6 sm:p-8">
          {/* Logo */}
          <div className="text-center mb-6">
            <img src="/images/shopland-logo.png" alt="ShopLandBD" className="w-20 h-20 mx-auto mb-4 object-contain" />
            <h1 className="text-2xl font-bold">{t('ShopLandBD-তে স্বাগতম', 'Welcome to ShopLandBD')}</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {t('আপনার অ্যাকাউন্টে সাইন ইন করুন অথবা নতুন তৈরি করুন', 'Sign in to your account or create a new one')}
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin" className="rounded-lg">
                {t('সাইন ইন', 'Sign In')}
              </TabsTrigger>
              <TabsTrigger value="signup" className="rounded-lg">
                {t('সাইন আপ', 'Sign Up')}
              </TabsTrigger>
            </TabsList>

            {/* Sign In Tab */}
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-identifier">{t('ইমেইল অথবা ফোন নম্বর', 'Email or Phone Number')}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="signin-identifier"
                      type="text"
                      placeholder={t('ইমেইল অথবা 01XXXXXXXXX', 'Email or 01XXXXXXXXX')}
                      value={signInIdentifier}
                      onChange={(e) => {
                        setSignInIdentifier(e.target.value);
                        setSignInErrors((prev) => ({ ...prev, identifier: undefined }));
                      }}
                      className={`pl-10 ${signInErrors.identifier ? 'border-destructive' : ''}`}
                    />
                  </div>
                  {signInErrors.identifier && (
                    <p className="text-xs text-destructive">{signInErrors.identifier}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signin-password">{t('পাসওয়ার্ড', 'Password')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="signin-password"
                      type={showSignInPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={signInPassword}
                      onChange={(e) => {
                        setSignInPassword(e.target.value);
                        setSignInErrors((prev) => ({ ...prev, password: undefined }));
                      }}
                      className={`pl-10 pr-10 ${signInErrors.password ? 'border-destructive' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignInPassword(!showSignInPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showSignInPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {signInErrors.password && (
                    <p className="text-xs text-destructive">{signInErrors.password}</p>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => setActiveTab('signup')}
                    className="text-sm text-primary hover:underline"
                  >
                    {t('অ্যাকাউন্ট তৈরি করুন', 'Create Account')}
                  </button>
                  <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                    {t('পাসওয়ার্ড ভুলে গেছেন?', 'Forgot password?')}
                  </Link>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={signInLoading}>
                  {signInLoading ? t('লগইন হচ্ছে...', 'Signing in...') : t('সাইন ইন', 'Sign In')}
                </Button>
              </form>
            </TabsContent>

            {/* Sign Up Tab */}
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">{t('পুরো নাম', 'Full Name')} *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder={t('আপনার নাম', 'Your Name')}
                      value={signUpName}
                      onChange={(e) => {
                        setSignUpName(e.target.value);
                        setSignUpErrors((prev) => ({ ...prev, name: undefined }));
                      }}
                      className={`pl-10 ${signUpErrors.name ? 'border-destructive' : ''}`}
                    />
                  </div>
                  {signUpErrors.name && (
                    <p className="text-xs text-destructive">{signUpErrors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-phone">{t('ফোন নম্বর', 'Phone Number')} *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="signup-phone"
                      type="tel"
                      placeholder="01XXXXXXXXX"
                      value={signUpPhone}
                      onChange={(e) => {
                        setSignUpPhone(e.target.value);
                        setSignUpErrors((prev) => ({ ...prev, phone: undefined }));
                      }}
                      className={`pl-10 ${signUpErrors.phone ? 'border-destructive' : ''}`}
                    />
                  </div>
                  {signUpErrors.phone && (
                    <p className="text-xs text-destructive">{signUpErrors.phone}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">
                    {t('ইমেইল', 'Email')} <span className="text-muted-foreground text-xs">({t('ঐচ্ছিক', 'optional')})</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder={t('আপনার ইমেইল', 'your@email.com')}
                      value={signUpEmail}
                      onChange={(e) => {
                        setSignUpEmail(e.target.value);
                        setSignUpErrors((prev) => ({ ...prev, email: undefined }));
                      }}
                      className={`pl-10 ${signUpErrors.email ? 'border-destructive' : ''}`}
                    />
                  </div>
                  {signUpErrors.email && (
                    <p className="text-xs text-destructive">{signUpErrors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">{t('পাসওয়ার্ড', 'Password')} *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type={showSignUpPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={signUpPassword}
                      onChange={(e) => {
                        setSignUpPassword(e.target.value);
                        setSignUpErrors((prev) => ({ ...prev, password: undefined }));
                      }}
                      className={`pl-10 pr-10 ${signUpErrors.password ? 'border-destructive' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showSignUpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {signUpErrors.password && (
                    <p className="text-xs text-destructive">{signUpErrors.password}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">{t('পাসওয়ার্ড নিশ্চিত করুন', 'Confirm Password')} *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="signup-confirm-password"
                      type={showSignUpPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={signUpConfirmPassword}
                      onChange={(e) => {
                        setSignUpConfirmPassword(e.target.value);
                        setSignUpErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                      }}
                      className={`pl-10 ${signUpErrors.confirmPassword ? 'border-destructive' : ''}`}
                    />
                  </div>
                  {signUpErrors.confirmPassword && (
                    <p className="text-xs text-destructive">{signUpErrors.confirmPassword}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={signUpLoading}>
                  {signUpLoading ? t('তৈরি হচ্ছে...', 'Creating...') : t('অ্যাকাউন্ট তৈরি করুন', 'Create Account')}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        {/* Guest Note */}
        <div className="mt-4 bg-card rounded-xl border p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">{t('গেস্ট হিসেবে', 'As Guest')}</p>
              <p className="text-muted-foreground text-xs mt-0.5">
                {t(
                  'অ্যাকাউন্ট ছাড়াই অর্ডার করতে পারবেন। চেকআউটে আপনার তথ্য দিন।',
                  'You can place orders without an account. Just provide your details at checkout.'
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
