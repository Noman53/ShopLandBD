import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const SESSION_TIMEOUT_MS = 45 * 60 * 1000; // 45 minutes
const ACTIVITY_CHECK_INTERVAL_MS = 60 * 1000; // check every 60s
const ACTIVITY_THROTTLE_MS = 5000; // throttle activity updates to every 5s

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null; data: any }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function updateLastActivity() {
  sessionStorage.setItem('lastActivity', Date.now().toString());
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const lastActivityRef = useRef(Date.now());

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    // Clear guest cart and related data
    localStorage.removeItem('cart-items');
    localStorage.removeItem('cart-timestamp');
    sessionStorage.removeItem('lastActivity');
  }, []);

  // Inactivity tracker
  useEffect(() => {
    // Initialize activity timestamp
    updateLastActivity();
    lastActivityRef.current = Date.now();

    // Throttled activity handler
    let lastUpdate = Date.now();
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastUpdate > ACTIVITY_THROTTLE_MS) {
        lastUpdate = now;
        lastActivityRef.current = now;
        updateLastActivity();
      }
    };

    // Track discrete user interactions without listening to continuous scroll/mousemove events
    const events = ['pointerdown', 'keydown', 'click'];
    events.forEach(e => window.addEventListener(e, handleActivity, { passive: true }));

    // Check if session has expired due to inactivity
    const checkExpiration = () => {
      const lastStr = sessionStorage.getItem('lastActivity');
      const lastTime = lastStr ? parseInt(lastStr, 10) : Date.now();
      
      if (Date.now() - lastTime > SESSION_TIMEOUT_MS) {
        supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
          if (currentSession) {
            toast.info('আপনার সেশন মেয়াদ শেষ হয়েছে। আবার লগইন করুন।', {
              description: 'Session expired due to inactivity. Please login again.',
            });
            signOut();
          }
        });
        // Also clear guest cart on inactivity
        const cartTs = localStorage.getItem('cart-timestamp');
        if (cartTs && Date.now() - parseInt(cartTs, 10) > SESSION_TIMEOUT_MS) {
          localStorage.removeItem('cart-items');
          localStorage.removeItem('cart-timestamp');
        }
      }
    };

    // Periodic check (works when tab is active)
    const intervalId = setInterval(checkExpiration, ACTIVITY_CHECK_INTERVAL_MS);

    // Also check when tab becomes visible again (handles browser throttling background tabs)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkExpiration();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      events.forEach(e => window.removeEventListener(e, handleActivity));
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [signOut]);

  useEffect(() => {
    let isMounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (session) {
          updateLastActivity();
        }
      }
    );

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    return { error, data };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!error) {
      updateLastActivity();
    }
    return { error };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signUp,
        signIn,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
