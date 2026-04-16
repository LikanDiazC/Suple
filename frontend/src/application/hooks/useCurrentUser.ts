'use client';

import { useAuth } from '../context/auth/AuthContext';

export interface CurrentUser {
  email: string;
  name: string;
  initials: string;
}

const DEMO_USER: CurrentUser = {
  email: 'demo@suple.cl',
  name: 'Demo User',
  initials: 'DU',
};

/**
 * Returns the current user info.
 *
 * - In demo mode → static demo user (no localStorage lookup).
 * - In authenticated mode → derives name/email from the auth session.
 */
export function useCurrentUser(): CurrentUser {
  const { user, isDemoMode } = useAuth();

  if (isDemoMode) return DEMO_USER;

  if (!user?.email) return DEMO_USER; // fallback while loading

  const email = user.email;
  const raw = user.name ?? email.split('@')[0];
  const parts = raw.split(/[\s.]+/).filter(Boolean);
  const initials =
    parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : raw.slice(0, 2).toUpperCase();

  return { email, name: raw, initials };
}
