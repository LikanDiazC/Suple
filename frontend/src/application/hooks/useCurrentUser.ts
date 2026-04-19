'use client';

import { useAuth } from '../context/auth/AuthContext';

export interface CurrentUser {
  email: string;
  name: string;
  initials: string;
}

const FALLBACK_USER: CurrentUser = {
  email: '',
  name: 'Invitado',
  initials: 'IN',
};

export function useCurrentUser(): CurrentUser {
  const { user } = useAuth();
  if (!user?.email) return FALLBACK_USER;

  const email = user.email;
  const raw = user.fullName?.trim() || email.split('@')[0];
  const parts = raw.split(/[\s.]+/).filter(Boolean);
  const initials =
    parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : raw.slice(0, 2).toUpperCase();

  return { email, name: raw, initials };
}
