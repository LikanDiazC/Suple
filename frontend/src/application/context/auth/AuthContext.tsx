'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { SessionProvider, useSession, signIn, signOut } from 'next-auth/react';
import type { Session } from 'next-auth';

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
  isDemoMode: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function AuthContextProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [demoUser, setDemoUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const demo = localStorage.getItem('demo_mode');
    if (demo === 'true') {
      try {
        const u = JSON.parse(localStorage.getItem('demo_user') || '{}');
        setDemoUser({ name: u.name || 'Demo User', email: u.email || 'demo@enterprise.com', image: null });
      } catch {
        setDemoUser({ name: 'Demo User', email: 'demo@enterprise.com', image: null });
      }
    }
  }, []);

  const isDemoMode = demoUser !== null;
  const effectiveUser = session?.user
    ? { name: session.user.name, email: session.user.email, image: session.user.image }
    : demoUser;

  const value: AuthContextValue = {
    session,
    status: isDemoMode ? 'authenticated' : status,
    user: effectiveUser,
    signIn,
    signOut: async (options) => {
      localStorage.removeItem('demo_mode');
      localStorage.removeItem('demo_user');
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
