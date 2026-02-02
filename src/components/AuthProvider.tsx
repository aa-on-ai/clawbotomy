'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { User, Session, SupabaseClient } from '@supabase/supabase-js';
import type { AuthState } from '@/lib/auth-types';
import { createAuthClient } from '@/lib/supabase-auth';

interface AuthContextValue extends AuthState {
  supabase: SupabaseClient;
  signInWithGitHub: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Singleton client to avoid re-creating on every render
let _supabase: SupabaseClient | null = null;
function getSupabase() {
  if (!_supabase) _supabase = createAuthClient();
  return _supabase;
}

// TODO: wire into main nav/router (wrap children in layout.tsx with <AuthProvider>)
export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabase();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAnonymous = !user || !!user.is_anonymous;

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (s) {
        setSession(s);
        setUser(s.user);
        setIsLoading(false);
      } else {
        // Auto sign-in anonymously — open lab, no gates
        supabase.auth.signInAnonymously().then(({ data, error }) => {
          if (!error && data.session) {
            setSession(data.session);
            setUser(data.session.user);
          }
          setIsLoading(false);
        });
      }
    });

    // Listen for auth changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const signInWithGitHub = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }, [supabase]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    // Re-create anonymous session after sign-out
    const { data } = await supabase.auth.signInAnonymously();
    if (data.session) {
      setSession(data.session);
      setUser(data.session.user);
    }
  }, [supabase]);

  return (
    <AuthContext.Provider
      value={{ user, session, isAnonymous, isLoading, supabase, signInWithGitHub, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
