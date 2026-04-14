'use client';

import { useState, useEffect } from 'react';

export interface CurrentUser {
  email: string;
  name: string;
  initials: string;
}

const DEFAULT: CurrentUser = { email: 'admin@empresa.com', name: 'Admin Demo', initials: 'AD' };

export function useCurrentUser(): CurrentUser {
  const [user, setUser] = useState<CurrentUser>(DEFAULT);

  useEffect(() => {
    const email = localStorage.getItem('user_email') ?? DEFAULT.email;
    const raw   = localStorage.getItem('user_name')  ?? email.split('@')[0];
    const parts = raw.split(/[\s.]+/).filter(Boolean);
    const initials = parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : raw.slice(0, 2).toUpperCase();
    setUser({ email, name: raw, initials });
  }, []);

  return user;
}
