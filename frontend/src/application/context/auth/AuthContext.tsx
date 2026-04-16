'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { SessionProvider, useSession, signIn, signOut } from 'next-auth/react';
import type { Session } from 'next-auth';
import { clearDemoMode, isDemoClient } from '@/lib/demoMode';

interface AuthUser {
  name: string | null | undefined;
  email: string | null | undefined;
  image: string | null | undefined;
}

interface AuthContextValue {
  session: Session | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  user: AuthUser | null;
  signIn: typeof signIn;
  signOut: typeof signOut;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** True when running in demo mode (static data only, no APIs). */
  isDemoMode: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function AuthContextProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [demoUser, setDemoUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    // ── Mutual exclusivity ──────────────────────────────────────────────
    // If the user has a real session, demo mode must be cleared so
    // the two never coexist.
    if (session?.user) {
      if (isDemoClient()) {
        clearDemoMode();
      }
      setDemoUser(null);
      return;
    }

    // No real session — check for demo mode
    if (isDemoClient()) {
      try {
        const u = JSON.parse(localStorage.getItem('demo_user') || '{}');
        setDemoUser({
          name: u.name || 'Demo User',
          email: u.email || 'demo@suple.cl',
          image: null,
        });
      } catch {
        setDemoUser({
          name: 'Demo User',
          email: 'demo@suple.cl',
          image: null,
        });
      }
    } else {
      setDemoUser(null);
    }
  }, [session]);

  const isDemoMode = demoUser !== null;

  const effectiveUser: AuthUser | null = session?.user
    ? { name: session.user.name, email: session.user.email, image: session.user.image }
    : demoUser;

  const value: AuthContextValue = {
    session,
    status: isDemoMode ? 'authenticated' : status,
    user: effectiveUser,
    signIn,
    signOut: async (options) => {
      clearDemoMode();
      setDemoUser(null);
      return signOut(options);
    },
    isAuthenticated: status === 'authenticated' || isDemoMode,
    isLoading: status === 'loading' && !isDemoMode,
    isDemoMode,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthContextProvider>{children}</AuthContextProvider>
    </SessionProvider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
